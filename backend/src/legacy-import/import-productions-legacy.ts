import fs from "node:fs";
import pg from "pg";
import { parse } from "csv-parse";
import {
  LEGACY_IMPORT_PROGRESS_EVERY,
  legacyCsvParseOptions,
  normalizeRow,
  toLanguageMap,
  type CsvRecord,
  type ImportArgs,
} from "./shared.js";
import { CreateProductionBodySchema } from "@/routes/production/handlers/body-schema.js";
import {
  formatLegacyZodError,
  legacyGenreTagCreateBody,
  legacyProductionRowToCreateBody,
  LegacyTagCreateBodySchema,
} from "./validate-legacy-inserts.js";

export const LEGACY_PRODUCTION_IMPORT_SOURCE = "productions-output-csv";

/** JSON for a nullable JSONB language field, or SQL NULL. */
function jsonbLanguageNullable(value: Record<string, string> | null | undefined): string | null {
  if (value == null) return null;
  return JSON.stringify(value);
}

/** Split comma-separated genre cell into unique trimmed names. */
export function splitGenres(value: string): string[] {
  if (value.length === 0) return [];
  const result = new Set<string>();
  for (const part of value.split(",")) {
    const normalized = part.replace(/\s+/g, " ").trim();
    if (normalized.length > 0) result.add(normalized);
  }
  return [...result];
}

/** Case-insensitive key for genre tag cache lookups. */
export function genreKey(name: string): string {
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
     WHERE tag_type = $1`,
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
     WHERE tag_type = $1
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
    `INSERT INTO tag (name, tag_type, public)
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
  skippedValidationFailed: number;
  importedProductions: number;
  createdGenreTags: number;
  linkedProductionTags: number;
  failedRows: number;
};

/**
 * Stream legacy productions CSV into `production`, genre tags, and `legacy_production_import_map`.
 * Caller owns the client (connect / end).
 */
export async function importProductionsLegacy(client: pg.Client, args: ImportArgs): Promise<void> {
  if (!args.dryRun) {
    await ensureIdempotencyTable(client);
  }

  const existingImported = new Set<string>();
  if (!args.dryRun) {
    const existing = await client.query<{ legacy_id: string }>(
      `SELECT legacy_id
       FROM legacy_production_import_map
       WHERE source = $1`,
      [LEGACY_PRODUCTION_IMPORT_SOURCE],
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
    skippedValidationFailed: 0,
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

    if (stats.totalRows % LEGACY_IMPORT_PROGRESS_EVERY === 0) {
      console.log(
        `Progress ${stats.totalRows} rows | imported=${stats.importedProductions} | failed=${stats.failedRows}`,
      );
    }

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

    const genres = splitGenres(row["genre"] ?? "");

    const productionBody = legacyProductionRowToCreateBody(row);
    const productionParsed = CreateProductionBodySchema.safeParse(productionBody);
    if (!productionParsed.success) {
      stats.skippedValidationFailed++;
      console.error(
        `Validation failed for legacy production row (id=${legacyId}): ${formatLegacyZodError(productionParsed.error)}`,
      );
      continue;
    }

    const genreTagTypeIdForValidation = tagTypeGenre.id ?? 1;
    let genreValidationOk = true;
    for (const genre of genres) {
      const tagBody = legacyGenreTagCreateBody(genre, genreTagTypeIdForValidation);
      const tagParsed = LegacyTagCreateBodySchema.safeParse(tagBody);
      if (!tagParsed.success) {
        console.error(
          `Validation failed for genre tag (legacy id=${legacyId}, genre="${genre}"): ${formatLegacyZodError(tagParsed.error)}`,
        );
        genreValidationOk = false;
        break;
      }
    }
    if (!genreValidationOk) {
      stats.skippedValidationFailed++;
      continue;
    }

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

      const d = productionParsed.data;
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
          jsonbLanguageNullable(d.supertitle),
          JSON.stringify(d.title),
          JSON.stringify(d.artist),
          JSON.stringify(d.tagline),
          JSON.stringify(d.teaser),
          jsonbLanguageNullable(d.description),
          jsonbLanguageNullable(d.description_extra),
          jsonbLanguageNullable(d.description_2),
          jsonbLanguageNullable(d.video_1),
          jsonbLanguageNullable(d.video_2),
          jsonbLanguageNullable(d.quote),
          jsonbLanguageNullable(d.quote_source),
          jsonbLanguageNullable(d.programme),
          jsonbLanguageNullable(d.info),
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
          `INSERT INTO production_tag (production, tag)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [productionId, tagResult.id],
        );
        stats.linkedProductionTags += linkResult.rowCount ?? 0;
      }

      await client.query(
        `INSERT INTO legacy_production_import_map (source, legacy_id, production_id)
         VALUES ($1, $2, $3)`,
        [LEGACY_PRODUCTION_IMPORT_SOURCE, legacyId, productionId],
      );

      await client.query("COMMIT");
      existingImported.add(legacyId);
      stats.importedProductions++;
    } catch (error) {
      await client.query("ROLLBACK");
      stats.failedRows++;
      console.error(`Failed row with legacy ID ${legacyId}:`, error);
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
  console.log(`  Skipped (Zod validation failed): ${stats.skippedValidationFailed}`);
  console.log(`  Failed rows: ${stats.failedRows}`);
}
