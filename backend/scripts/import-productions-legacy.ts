import fs from "node:fs";
import pg from "pg";
import { parse } from "csv-parse";
import {
  assertCsvFileExists,
  assertDatabaseUrl,
  LEGACY_IMPORT_PROGRESS_EVERY,
  legacyCsvParseOptions,
  normalizeRow,
  parseImportArgs,
  resolveDefaultLegacyImportFile,
  toLanguageMap,
  type CsvRecord,
} from "@/legacy-import/shared.js";

const SOURCE_NAME = "productions-output-csv";
const DEFAULT_FILE = resolveDefaultLegacyImportFile(import.meta.url, [
  "data",
  "imports",
  "productions.csv",
]);

function printHelp() {
  console.log("Import legacy productions CSV into Postgres.");
  console.log("");
  console.log("Usage:");
  console.log("  pnpm run import:productions -- [path/to/file.csv] [--dry-run] [--limit 100]");
  console.log("  pnpm run import:productions -- --file \"path/to/file.csv\" [--dry-run] [--limit 100]");
  console.log("");
  console.log("Options:");
  console.log("  path/to/file.csv Positional file path argument (optional)");
  console.log("  --file <path>    CSV file path argument (optional)");
  console.log(`  default path     ${DEFAULT_FILE}`);
  console.log("  --dry-run       Parse and validate only, no database writes");
  console.log("  --limit <n>     Stop after reading n rows");
}

function nullableLanguageMap(value: string): Record<"nl", string> | null {
  return value.length === 0 ? null : { nl: value };
}

function splitGenres(value: string): string[] {
  if (value.length === 0) return [];
  const result = new Set<string>();
  for (const part of value.split(",")) {
    const normalized = part.replace(/\s+/g, " ").trim();
    if (normalized.length > 0) result.add(normalized);
  }
  return [...result];
}

function genreKey(name: string): string {
  return name.trim().toLowerCase();
}

async function ensureIdempotencyTable(client: pg.Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS legacy_production_import_map (
      source TEXT NOT NULL,
      legacy_id TEXT NOT NULL,
      production_id INT NOT NULL REFERENCES production(id) ON DELETE CASCADE,
      imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (source, legacy_id)
    )
  `);
}

async function getOrCreateTagTypeId(
  client: pg.Client,
  nameNl: string,
  dryRun: boolean,
): Promise<{ id: number | null; created: boolean }> {
  const existing = await client.query<{ id: number }>(
    `SELECT id
     FROM tag_type
     WHERE lower(name->>'nl') = lower($1)
     LIMIT 1`,
    [nameNl],
  );

  const id = existing.rows[0]?.id;
  if (id) return { id, created: false };
  if (dryRun) return { id: null, created: true };

  const inserted = await client.query<{ id: number }>(
    `INSERT INTO tag_type (name)
     VALUES ($1::jsonb)
     RETURNING id`,
    [JSON.stringify(toLanguageMap(nameNl))],
  );

  return { id: inserted.rows[0]!.id, created: true };
}

async function loadGenreTagCache(client: pg.Client, genreTagTypeId: number): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const existingTags = await client.query<{ id: number; name: string }>(
    `SELECT id, name->>'nl' AS name
     FROM tag
     WHERE type_id = $1`,
    [genreTagTypeId],
  );

  for (const tag of existingTags.rows) {
    map.set(genreKey(tag.name), tag.id);
  }
  return map;
}

async function getOrCreateGenreTagId(
  client: pg.Client,
  genreName: string,
  genreTagTypeId: number,
  dryRun: boolean,
  cache: Map<string, number>,
): Promise<{ id: number | null; created: boolean }> {
  const key = genreKey(genreName);
  const cached = cache.get(key);
  if (cached) return { id: cached, created: false };

  const existing = await client.query<{ id: number }>(
    `SELECT id
     FROM tag
     WHERE type_id = $1
       AND lower(name->>'nl') = lower($2)
     LIMIT 1`,
    [genreTagTypeId, genreName],
  );
  const existingId = existing.rows[0]?.id;
  if (existingId) {
    cache.set(key, existingId);
    return { id: existingId, created: false };
  }

  if (dryRun) {
    return { id: null, created: true };
  }

  const inserted = await client.query<{ id: number }>(
    `INSERT INTO tag (name, type_id, public)
     VALUES ($1::jsonb, $2, true)
     RETURNING id`,
    [JSON.stringify(toLanguageMap(genreName)), genreTagTypeId],
  );
  const insertedId = inserted.rows[0]!.id;
  cache.set(key, insertedId);
  return { id: insertedId, created: true };
}

type ImportStats = {
  totalRows: number;
  skippedNoLegacyId: number;
  skippedDuplicateLegacyIdInFile: number;
  skippedAlreadyImported: number;
  skippedNoTitle: number;
  importedProductions: number;
  createdGenreTags: number;
  linkedProductionTags: number;
  failedRows: number;
};

async function main() {
  const parsed = parseImportArgs(process.argv.slice(2), { defaultFile: DEFAULT_FILE });
  if (parsed === "help") {
    printHelp();
    process.exit(0);
  }
  const args = parsed;

  assertDatabaseUrl();
  assertCsvFileExists(args.filePath);

  const client = new pg.Client({ connectionString: process.env["DATABASE_URL"] });
  await client.connect();

  try {
    if (!args.dryRun) {
      await ensureIdempotencyTable(client);
    }

    const existingImported = new Set<string>();
    if (!args.dryRun) {
      const existing = await client.query<{ legacy_id: string }>(
        `SELECT legacy_id
         FROM legacy_production_import_map
         WHERE source = $1`,
        [SOURCE_NAME],
      );
      for (const row of existing.rows) existingImported.add(row.legacy_id);
    }

    const tagTypeTag = await getOrCreateTagTypeId(client, "Tag", args.dryRun);
    const tagTypeGenre = await getOrCreateTagTypeId(client, "Genre", args.dryRun);
    const genreTagCache = tagTypeGenre.id
      ? await loadGenreTagCache(client, tagTypeGenre.id)
      : new Map<string, number>();

    console.log(`CSV file: ${args.filePath}`);
    console.log(`Mode: ${args.dryRun ? "dry-run" : "write"}`);
    if (args.limit) console.log(`Row limit: ${args.limit}`);
    console.log(`TagType "Tag": ${tagTypeTag.created ? "will be created / created" : "exists"}`);
    console.log(`TagType "Genre": ${tagTypeGenre.created ? "will be created / created" : "exists"}`);

    const stats: ImportStats = {
      totalRows: 0,
      skippedNoLegacyId: 0,
      skippedDuplicateLegacyIdInFile: 0,
      skippedAlreadyImported: 0,
      skippedNoTitle: 0,
      importedProductions: 0,
      createdGenreTags: 0,
      linkedProductionTags: 0,
      failedRows: 0,
    };

    const seenLegacyInCurrentFile = new Set<string>();
    const stream = fs.createReadStream(args.filePath);
    const parser = parse({ ...legacyCsvParseOptions });
    stream.pipe(parser);

    for await (const rowRaw of parser as AsyncIterable<CsvRecord>) {
      if (args.limit !== null && stats.totalRows >= args.limit) break;
      stats.totalRows++;

      const row = normalizeRow(rowRaw);
      const legacyId = row["id"] ?? "";
      if (legacyId.length === 0) {
        stats.skippedNoLegacyId++;
        continue;
      }
      if (seenLegacyInCurrentFile.has(legacyId)) {
        stats.skippedDuplicateLegacyIdInFile++;
        continue;
      }
      seenLegacyInCurrentFile.add(legacyId);

      if (existingImported.has(legacyId)) {
        stats.skippedAlreadyImported++;
        continue;
      }

      const title = row["titel"] ?? "";
      if (title.length === 0) {
        stats.skippedNoTitle++;
        continue;
      }

      const artist = row["ondertitel"] ?? "";
      const description1 = row["description1"] ?? "";
      const description2 = row["description2"] ?? "";
      const genres = splitGenres(row["genre"] ?? "");

      if (args.dryRun) {
        for (const genre of genres) {
          const key = genreKey(genre);
          if (!genreTagCache.has(key)) {
            genreTagCache.set(key, -1);
            stats.createdGenreTags++;
          }
        }
        stats.importedProductions++;
        continue;
      }

      if (!tagTypeGenre.id) {
        throw new Error("TagType 'Genre' ID is missing in write mode");
      }

      try {
        await client.query("BEGIN");

        const insertedProduction = await client.query<{ id: number }>(
          `INSERT INTO production (
             supertitle, title, artist, tagline, teaser,
             description, description_extra, description_2,
             video_1, video_2, quote, quote_source, programme, info
           ) VALUES (
             $1::jsonb, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb,
             $6::jsonb, $7::jsonb, $8::jsonb,
             $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb
           )
           RETURNING id`,
          [
            null,
            JSON.stringify(toLanguageMap(title)),
            JSON.stringify(toLanguageMap(artist)),
            JSON.stringify(toLanguageMap("")),
            JSON.stringify(toLanguageMap("")),
            description1.length > 0 ? JSON.stringify(toLanguageMap(description1)) : null,
            null,
            nullableLanguageMap(description2) ? JSON.stringify(toLanguageMap(description2)) : null,
            null,
            null,
            null,
            null,
            null,
            null,
          ],
        );
        const productionId = insertedProduction.rows[0]!.id;

        for (const genre of genres) {
          const tagResult = await getOrCreateGenreTagId(
            client,
            genre,
            tagTypeGenre.id,
            false,
            genreTagCache,
          );
          if (!tagResult.id) continue;
          if (tagResult.created) stats.createdGenreTags++;

          const linkResult = await client.query(
            `INSERT INTO production_tag (production_id, tag_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [productionId, tagResult.id],
          );
          stats.linkedProductionTags += linkResult.rowCount ?? 0;
        }

        await client.query(
          `INSERT INTO legacy_production_import_map (source, legacy_id, production_id)
           VALUES ($1, $2, $3)`,
          [SOURCE_NAME, legacyId, productionId],
        );

        await client.query("COMMIT");
        existingImported.add(legacyId);
        stats.importedProductions++;
      } catch (error) {
        await client.query("ROLLBACK");
        stats.failedRows++;
        console.error(`Failed row with legacy ID ${legacyId}:`, error);
      }

      if (stats.totalRows % LEGACY_IMPORT_PROGRESS_EVERY === 0) {
        console.log(
          `Progress ${stats.totalRows} rows | imported=${stats.importedProductions} | failed=${stats.failedRows}`,
        );
      }
    }

    console.log("");
    console.log("Import finished:");
    console.log(`  Rows read: ${stats.totalRows}`);
    console.log(`  Imported productions: ${stats.importedProductions}`);
    console.log(`  Created genre tags: ${stats.createdGenreTags}`);
    console.log(`  Linked production_tag rows: ${stats.linkedProductionTags}`);
    console.log(`  Skipped (already imported): ${stats.skippedAlreadyImported}`);
    console.log(`  Skipped (missing legacy ID): ${stats.skippedNoLegacyId}`);
    console.log(`  Skipped (duplicate legacy ID in file): ${stats.skippedDuplicateLegacyIdInFile}`);
    console.log(`  Skipped (missing title): ${stats.skippedNoTitle}`);
    console.log(`  Failed rows: ${stats.failedRows}`);
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
