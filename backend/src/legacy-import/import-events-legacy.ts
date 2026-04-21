import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { parse } from "csv-parse";
import {
  indexLanguageMapValues,
  SQL_FIND_HALL_ID_BY_ANY_LANG_NAME,
  SQL_LIST_PRODUCTION_IDS_BY_TITLE_AND_ARTIST,
} from "./jsonb-name-match.js";
import {
  cleanValue,
  LEGACY_IMPORT_PROGRESS_EVERY,
  legacyCsvParseOptions,
  normalizeRow,
  toLanguageMap,
  type CsvRecord,
  type ImportArgs,
} from "./shared.js";
import {
  formatLegacyZodError,
  legacyEventCreateBody,
  legacyHallInsertBody,
  LegacyHallInsertSchema,
} from "./validate-legacy-inserts.js";
import { EventCreateSchema } from "@/routes/event/handlers/helper.js";

/** Alias for callers/tests; same as {@link ImportArgs} (includes optional `productionsFilePath`). */
export type LegacyEventImportArgs = ImportArgs;

export const LEGACY_EVENT_IMPORT_SOURCE = "events-voorstellingen-csv";
export const LEGACY_EVENT_PRODUCTION_MAP_SOURCE = "productions-output-csv";

/** True when this legacy production row was inserted by the importer (vs mapped to existing API row). */
export type ProductionMapEntry = {
  productionId: number;
  createdNew: boolean;
};

type ParsedHall = {
  name: string;
  address: string;
};

type ImportStats = {
  totalRows: number;
  importedEvents: number;
  createdHalls: number;
  skippedMissingStart: number;
  skippedMissingHall: number;
  skippedMissingProductionLegacyId: number;
  skippedUnknownProduction: number;
  skippedDuplicateInFile: number;
  skippedAlreadyImported: number;
  skippedValidationFailed: number;
  skippedFullDuplicateProductionEvent: number;
  deletedOrphanProductionsAfterDuplicate: number;
  failedRows: number;
};

type BufferedEventRow = {
  row: Record<string, string>;
  legacyKey: string;
};

const SQL_EVENT_EXISTS_ON_PRODUCTIONS_FOR_BRUSSELS_DAYS = `
SELECT EXISTS (
  SELECT 1
  FROM unnest($1::date[]) AS gd(gday)
  WHERE EXISTS (
    SELECT 1 FROM event e
    WHERE e.production = ANY($2::int[])
    AND (e.starts_at AT TIME ZONE 'Europe/Brussels')::date = gd.gday
  )
)
`;

function defaultLegacyProductionsCsvPath(): string {
  return path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "..",
    "data",
    "imports",
    "productions.csv",
  );
}

/** Calendar date string YYYY-MM-DD in Europe/Brussels for a UTC instant (matches DB comparison). */
export function calendarDateBrussels(utc: Date): string {
  return utc.toLocaleDateString("en-CA", { timeZone: "Europe/Brussels" });
}

/** Parse legacy event datetime cell to UTC Date or null. */
export function parseCsvDate(value: string): Date | null {
  const raw = cleanValue(value);
  if (raw.length === 0) return null;
  if (raw === "0000-00-00 00:00:00") return null;
  if (raw === "1970-01-01 00:00:00") return null;
  const iso = raw.replace(" ", "T") + "Z";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Parse `Hall` column: `name` or `name, address`. */
export function parseHall(value: string): ParsedHall | null {
  const normalized = cleanValue(value);
  if (normalized.length === 0) return null;

  const commaIndex = normalized.indexOf(",");
  if (commaIndex === -1) {
    return { name: normalized, address: "" };
  }

  const name = normalized.slice(0, commaIndex).trim();
  const address = normalized.slice(commaIndex + 1).trim();
  if (name.length === 0) return null;
  return { name, address };
}

/** Stable idempotency key for an event row. */
export function makeLegacyKey(row: Record<string, string>): string {
  const payload = `${row["starttime"] ?? ""}|${row["endtime"] ?? ""}|${row["hall"] ?? ""}|${row["production"] ?? ""}`;
  return crypto.createHash("sha1").update(payload).digest("hex");
}

/** Case-insensitive key for hall cache. */
export function hallKey(name: string): string {
  return name.trim().toLowerCase();
}

async function ensureIdempotencyTable(client: pg.Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS legacy_event_import_map (
      source TEXT NOT NULL,
      legacy_key TEXT NOT NULL,
      event_id INT NOT NULL,
      imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (source, legacy_key)
    )
  `);
}

async function assertProductionMapTableExists(client: pg.Client): Promise<void> {
  const result = await client.query<{ exists: string | null }>(
    `SELECT to_regclass('public.legacy_production_import_map') AS exists`,
  );
  if (!result.rows[0]?.exists) {
    throw new Error(
      "Missing table legacy_production_import_map. Run the production import first in write mode.",
    );
  }
}

async function loadProductionMap(client: pg.Client): Promise<Map<string, ProductionMapEntry>> {
  const map = new Map<string, ProductionMapEntry>();
  const rows = await client.query<{
    legacy_id: string;
    production_id: number;
    created_new_production: boolean | null;
  }>(
    `SELECT legacy_id, production_id,
            COALESCE(created_new_production, false) AS created_new_production
     FROM legacy_production_import_map
     WHERE source = $1`,
    [LEGACY_EVENT_PRODUCTION_MAP_SOURCE],
  );
  for (const row of rows.rows) {
    map.set(row.legacy_id, {
      productionId: row.production_id,
      createdNew: row.created_new_production === true,
    });
  }
  return map;
}

async function loadLegacyProductionMetaFromCsv(filePath: string): Promise<Map<string, { titel: string; ondertitel: string }>> {
  const map = new Map<string, { titel: string; ondertitel: string }>();
  const stream = fs.createReadStream(filePath);
  const parser = parse({ ...legacyCsvParseOptions });
  stream.pipe(parser);
  for await (const rowRaw of parser as AsyncIterable<CsvRecord>) {
    const row = normalizeRow(rowRaw);
    const legacyId = row["id"] ?? "";
    if (legacyId.length === 0) continue;
    map.set(legacyId, { titel: row["titel"] ?? "", ondertitel: row["ondertitel"] ?? "" });
  }
  return map;
}

async function listProductionIdsByTitleAndArtist(
  client: pg.Client,
  titel: string,
  ondertitel: string,
): Promise<number[]> {
  const t = titel.trim();
  if (t.length === 0) return [];
  const a = ondertitel.trim();
  const result = await client.query<{ id: number }>(SQL_LIST_PRODUCTION_IDS_BY_TITLE_AND_ARTIST, [t, a]);
  return result.rows.map((r) => r.id);
}

async function loadHallCache(client: pg.Client): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const rows = await client.query<{ id: number; name: unknown }>(
    `SELECT id, name FROM hall`,
  );
  for (const row of rows.rows) {
    indexLanguageMapValues(map, row.id, row.name, hallKey);
  }
  return map;
}

async function getOrCreateHallId(
  client: pg.Client,
  hall: ParsedHall,
  dryRun: boolean,
  cache: Map<string, number>,
): Promise<{ id: number | null; created: boolean }> {
  const key = hallKey(hall.name);
  const cached = cache.get(key);
  if (cached) return { id: cached, created: false };

  const existing = await client.query<{ id: number; address: string | null }>(
    SQL_FIND_HALL_ID_BY_ANY_LANG_NAME,
    [hall.name],
  );
  const existingHall = existing.rows[0];
  if (existingHall) {
    if (!dryRun && hall.address.length > 0 && (!existingHall.address || existingHall.address.length === 0)) {
      await client.query(`UPDATE hall SET address = $1 WHERE id = $2`, [hall.address, existingHall.id]);
    }
    cache.set(key, existingHall.id);
    return { id: existingHall.id, created: false };
  }

  if (dryRun) return { id: null, created: true };

  const inserted = await client.query<{ id: number }>(
    `INSERT INTO hall (name, address)
     VALUES ($1::jsonb, $2)
     RETURNING id`,
    [JSON.stringify(toLanguageMap(hall.name)), hall.address],
  );
  const id = inserted.rows[0]!.id;
  cache.set(key, id);
  return { id, created: true };
}

async function legacyProductionIsFullDuplicateOfExistingEvents(
  client: pg.Client,
  titel: string,
  ondertitel: string,
  mappedProductionId: number,
  legacyStartsUtc: Date[],
): Promise<boolean> {
  const matchingIds = await listProductionIdsByTitleAndArtist(client, titel, ondertitel);
  const others = matchingIds.filter((id) => id !== mappedProductionId);
  const productionIdsForDayCheck = others.length > 0 ? others : [mappedProductionId];
  const dayStrings = new Set<string>();
  for (const d of legacyStartsUtc) {
    dayStrings.add(calendarDateBrussels(d));
  }
  if (dayStrings.size === 0) return false;
  const days = [...dayStrings].sort();
  const result = await client.query<{ exists: boolean }>(SQL_EVENT_EXISTS_ON_PRODUCTIONS_FOR_BRUSSELS_DAYS, [
    days,
    productionIdsForDayCheck,
  ]);
  return result.rows[0]?.exists === true;
}

/**
 * Stream legacy events CSV into `event`, halls, and `legacy_event_import_map`.
 * Requires production import map rows for {@link LEGACY_EVENT_PRODUCTION_MAP_SOURCE}.
 * Groups rows by legacy production id so duplicate calendar days vs API can skip the whole production safely.
 * Caller owns the client (connect / end).
 *
 * `args.productionsFilePath` (from `--productions-file` or default) must point at the same productions export
 * used for title/artist dedupe; when omitted, falls back to repo `data/imports/productions.csv` next to the backend package.
 */
export async function importEventsLegacy(client: pg.Client, args: ImportArgs): Promise<void> {
  await assertProductionMapTableExists(client);

  if (!args.dryRun) {
    await ensureIdempotencyTable(client);
  }

  const productionsCsvPath = args.productionsFilePath ?? defaultLegacyProductionsCsvPath();
  if (!fs.existsSync(productionsCsvPath)) {
    throw new Error(
      `Productions CSV not found: ${productionsCsvPath}. Pass productionsFilePath or add data/imports/productions.csv.`,
    );
  }

  const productionMetaByLegacyId = await loadLegacyProductionMetaFromCsv(productionsCsvPath);
  let productionMap = await loadProductionMap(client);
  if (productionMap.size === 0) {
    throw new Error("No production mappings found. Import productions first in write mode.");
  }

  const hallCache = await loadHallCache(client);

  const existingImported = new Set<string>();
  if (!args.dryRun) {
    const rows = await client.query<{ legacy_key: string }>(
      `SELECT legacy_key
       FROM legacy_event_import_map
       WHERE source = $1`,
      [LEGACY_EVENT_IMPORT_SOURCE],
    );
    for (const row of rows.rows) existingImported.add(row.legacy_key);
  }

  console.log(`CSV file: ${args.filePath}`);
  console.log(`Productions CSV (title/artist for dedupe): ${productionsCsvPath}`);
  console.log(`Mode: ${args.dryRun ? "dry-run" : "write"}`);
  if (args.limit) console.log(`Row limit: ${args.limit}`);
  console.log(`Known production mappings: ${productionMap.size}`);

  const stats: ImportStats = {
    totalRows: 0,
    importedEvents: 0,
    createdHalls: 0,
    skippedMissingStart: 0,
    skippedMissingHall: 0,
    skippedMissingProductionLegacyId: 0,
    skippedUnknownProduction: 0,
    skippedDuplicateInFile: 0,
    skippedAlreadyImported: 0,
    skippedValidationFailed: 0,
    skippedFullDuplicateProductionEvent: 0,
    deletedOrphanProductionsAfterDuplicate: 0,
    failedRows: 0,
  };

  const buffered: BufferedEventRow[] = [];
  const stream = fs.createReadStream(args.filePath);
  const parser = parse({ ...legacyCsvParseOptions });
  stream.pipe(parser);

  for await (const rowRaw of parser as AsyncIterable<CsvRecord>) {
    if (args.limit !== null && stats.totalRows >= args.limit) break;
    stats.totalRows++;

    const row = normalizeRow(rowRaw);
    buffered.push({ row, legacyKey: makeLegacyKey(row) });
  }

  const byLegacyProduction = new Map<string, BufferedEventRow[]>();
  for (const item of buffered) {
    const legacyProdId = cleanValue(item.row["production"]);
    if (legacyProdId.length === 0) continue;
    const list = byLegacyProduction.get(legacyProdId);
    if (list) list.push(item);
    else byLegacyProduction.set(legacyProdId, [item]);
  }

  const suppressedLegacyProductionIds = new Set<string>();
  const scheduledOrphanDeletes = new Map<string, number>();

  for (const [legacyProdId, group] of byLegacyProduction) {
    const mapEntry = productionMap.get(legacyProdId);
    if (!mapEntry) continue;

    const meta = productionMetaByLegacyId.get(legacyProdId);
    const title = meta?.titel?.trim() ?? "";
    if (title.length === 0) continue;

    const startsUtc: Date[] = [];
    for (const item of group) {
      const s = parseCsvDate(item.row["starttime"] ?? "");
      if (s) startsUtc.push(s);
    }

    const isDup = await legacyProductionIsFullDuplicateOfExistingEvents(
      client,
      title,
      meta?.ondertitel ?? "",
      mapEntry.productionId,
      startsUtc,
    );
    if (!isDup) continue;

    suppressedLegacyProductionIds.add(legacyProdId);
    if (mapEntry.createdNew) {
      scheduledOrphanDeletes.set(legacyProdId, mapEntry.productionId);
    }
  }

  if (!args.dryRun) {
    for (const [, productionId] of scheduledOrphanDeletes) {
      try {
        await client.query(`DELETE FROM production WHERE id = $1`, [productionId]);
        stats.deletedOrphanProductionsAfterDuplicate++;
      } catch (error) {
        stats.failedRows++;
        console.error(`Failed to delete orphan production ${productionId} after duplicate detection:`, error);
      }
    }
    if (scheduledOrphanDeletes.size > 0) {
      productionMap = await loadProductionMap(client);
    }
  }

  const seenKeysInFile = new Set<string>();

  let progressCounter = 0;
  for (const item of buffered) {
    progressCounter++;
    if (progressCounter % LEGACY_IMPORT_PROGRESS_EVERY === 0) {
      console.log(
        `Progress ${progressCounter}/${buffered.length} rows | imported=${stats.importedEvents} | failed=${stats.failedRows}`,
      );
    }

    const row = item.row;
    const legacyKey = item.legacyKey;

    if (seenKeysInFile.has(legacyKey)) {
      stats.skippedDuplicateInFile++;
      continue;
    }
    seenKeysInFile.add(legacyKey);

    if (existingImported.has(legacyKey)) {
      stats.skippedAlreadyImported++;
      continue;
    }

    const startsAt = parseCsvDate(row["starttime"] ?? "");
    if (!startsAt) {
      stats.skippedMissingStart++;
      continue;
    }

    const hallRaw = parseHall(row["hall"] ?? "");
    if (!hallRaw) {
      stats.skippedMissingHall++;
      continue;
    }

    const productionLegacyId = cleanValue(row["production"]);
    if (!productionLegacyId) {
      stats.skippedMissingProductionLegacyId++;
      continue;
    }

    if (suppressedLegacyProductionIds.has(productionLegacyId)) {
      stats.skippedFullDuplicateProductionEvent++;
      continue;
    }

    const mapEntry = productionMap.get(productionLegacyId);
    if (!mapEntry) {
      stats.skippedUnknownProduction++;
      continue;
    }
    const productionId = mapEntry.productionId;

    const endsAt = parseCsvDate(row["endtime"] ?? "");
    const doorsAt: Date | null = null;

    const hallInsertBody = legacyHallInsertBody(hallRaw);
    const hallParsed = LegacyHallInsertSchema.safeParse(hallInsertBody);
    if (!hallParsed.success) {
      stats.skippedValidationFailed++;
      console.error(
        `Validation failed for hall (legacy key=${legacyKey.slice(0, 8)}…): ${formatLegacyZodError(hallParsed.error)}`,
      );
      continue;
    }

    const existingHallIdDry = hallCache.get(hallKey(hallRaw.name));
    const hallIdForEventValidation =
      existingHallIdDry !== undefined && existingHallIdDry > 0 ? existingHallIdDry : 1;

    const eventBody = legacyEventCreateBody({
      startsAt,
      endsAt,
      doorsAt,
      productionId,
      hallId: hallIdForEventValidation,
    });
    const eventParsed = EventCreateSchema.safeParse(eventBody);
    if (!eventParsed.success) {
      stats.skippedValidationFailed++;
      console.error(
        `Validation failed for event (legacy key=${legacyKey.slice(0, 8)}…): ${formatLegacyZodError(eventParsed.error)}`,
      );
      continue;
    }

    if (args.dryRun) {
      const existingHallId = hallCache.get(hallKey(hallRaw.name));
      if (!existingHallId) {
        hallCache.set(hallKey(hallRaw.name), -1);
        stats.createdHalls++;
      }
      stats.importedEvents++;
      continue;
    }

    try {
      await client.query("BEGIN");

      const hallResult = await getOrCreateHallId(client, hallRaw, false, hallCache);
      if (!hallResult.id) {
        throw new Error(`Could not resolve hall for legacy key ${legacyKey}`);
      }
      if (hallResult.created) stats.createdHalls++;

      const ev = eventParsed.data;
      const insertedEvent = await client.query<{ id: number }>(
        `INSERT INTO event (starts_at, ends_at, doors_at, info, production, hall)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6)
         RETURNING id`,
        [
          ev.starts_at,
          ev.ends_at,
          ev.doors_at,
          JSON.stringify(ev.info),
          ev.production,
          hallResult.id,
        ],
      );
      const eventId = insertedEvent.rows[0]!.id;

      await client.query(
        `INSERT INTO legacy_event_import_map (source, legacy_key, event_id)
         VALUES ($1, $2, $3)`,
        [LEGACY_EVENT_IMPORT_SOURCE, legacyKey, eventId],
      );

      await client.query("COMMIT");
      existingImported.add(legacyKey);
      stats.importedEvents++;
    } catch (error) {
      await client.query("ROLLBACK");
      stats.failedRows++;
      console.error(`Failed row (legacy key=${legacyKey.slice(0, 8)}…):`, error);
    }
  }

  console.log("");
  console.log("Import finished:");
  console.log(`  Rows read: ${stats.totalRows}`);
  console.log(`  Imported events: ${stats.importedEvents}`);
  console.log(`  Created halls: ${stats.createdHalls}`);
  console.log(`  Skipped (full duplicate production vs API calendar day): ${stats.skippedFullDuplicateProductionEvent}`);
  if (!args.dryRun) {
    console.log(`  Deleted orphan productions after duplicate detection: ${stats.deletedOrphanProductionsAfterDuplicate}`);
  }
  console.log(`  Skipped (missing starttime): ${stats.skippedMissingStart}`);
  console.log(`  Skipped (missing hall): ${stats.skippedMissingHall}`);
  console.log(`  Skipped (missing production legacy id): ${stats.skippedMissingProductionLegacyId}`);
  console.log(`  Skipped (unknown production mapping): ${stats.skippedUnknownProduction}`);
  console.log(`  Skipped (duplicate in file): ${stats.skippedDuplicateInFile}`);
  console.log(`  Skipped (already imported): ${stats.skippedAlreadyImported}`);
  console.log(`  Skipped (Zod validation failed): ${stats.skippedValidationFailed}`);
  console.log(`  Failed rows: ${stats.failedRows}`);
}
