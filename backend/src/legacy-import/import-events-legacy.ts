import crypto from "node:crypto";
import fs from "node:fs";
import pg from "pg";
import { parse } from "csv-parse";
import {
  cleanValue,
  LEGACY_IMPORT_PROGRESS_EVERY,
  legacyCsvParseOptions,
  normalizeRow,
  toLanguageMap,
  type CsvRecord,
  type ImportArgs,
} from "./shared.js";

export const LEGACY_EVENT_IMPORT_SOURCE = "events-voorstellingen-csv";
export const LEGACY_EVENT_PRODUCTION_MAP_SOURCE = "productions-output-csv";

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
  failedRows: number;
};

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

async function loadProductionMap(client: pg.Client): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const rows = await client.query<{ legacy_id: string; production_id: number }>(
    `SELECT legacy_id, production_id
     FROM legacy_production_import_map
     WHERE source = $1`,
    [LEGACY_EVENT_PRODUCTION_MAP_SOURCE],
  );
  for (const row of rows.rows) {
    map.set(row.legacy_id, row.production_id);
  }
  return map;
}

async function loadHallCache(client: pg.Client): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const rows = await client.query<{ id: number; name: string }>(
    `SELECT id, name->>'nl' AS name
     FROM hall`,
  );
  for (const row of rows.rows) {
    map.set(hallKey(row.name), row.id);
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
    `SELECT id, address
     FROM hall
     WHERE lower(name->>'nl') = lower($1)
     LIMIT 1`,
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

/**
 * Stream legacy events CSV into `event`, halls, and `legacy_event_import_map`.
 * Requires production import map rows for {@link LEGACY_EVENT_PRODUCTION_MAP_SOURCE}.
 * Caller owns the client (connect / end).
 */
export async function importEventsLegacy(client: pg.Client, args: ImportArgs): Promise<void> {
  await assertProductionMapTableExists(client);

  if (!args.dryRun) {
    await ensureIdempotencyTable(client);
  }

  const productionMap = await loadProductionMap(client);
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
    failedRows: 0,
  };

  const seenKeysInFile = new Set<string>();
  const stream = fs.createReadStream(args.filePath);
  const parser = parse({ ...legacyCsvParseOptions });
  stream.pipe(parser);

  for await (const rowRaw of parser as AsyncIterable<CsvRecord>) {
    if (args.limit !== null && stats.totalRows >= args.limit) break;
    stats.totalRows++;

    const row = normalizeRow(rowRaw);
    const legacyKey = makeLegacyKey(row);

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

    const productionId = productionMap.get(productionLegacyId);
    if (!productionId) {
      stats.skippedUnknownProduction++;
      continue;
    }

    const endsAt = parseCsvDate(row["endtime"] ?? "") ?? startsAt;
    const doorsAt = startsAt;
    const info = toLanguageMap("");

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
        throw new Error(`Could not resolve hall for row ${stats.totalRows}`);
      }
      if (hallResult.created) stats.createdHalls++;

      const insertedEvent = await client.query<{ id: number }>(
        `INSERT INTO event (starts_at, ends_at, doors_at, info, production, hall)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6)
         RETURNING id`,
        [startsAt, endsAt, doorsAt, JSON.stringify(info), productionId, hallResult.id],
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
      console.error(`Failed row #${stats.totalRows}:`, error);
    }

    if (stats.totalRows % LEGACY_IMPORT_PROGRESS_EVERY === 0) {
      console.log(
        `Progress ${stats.totalRows} rows | imported=${stats.importedEvents} | failed=${stats.failedRows}`,
      );
    }
  }

  console.log("");
  console.log("Import finished:");
  console.log(`  Rows read: ${stats.totalRows}`);
  console.log(`  Imported events: ${stats.importedEvents}`);
  console.log(`  Created halls: ${stats.createdHalls}`);
  console.log(`  Skipped (missing starttime): ${stats.skippedMissingStart}`);
  console.log(`  Skipped (missing hall): ${stats.skippedMissingHall}`);
  console.log(`  Skipped (missing production legacy id): ${stats.skippedMissingProductionLegacyId}`);
  console.log(`  Skipped (unknown production mapping): ${stats.skippedUnknownProduction}`);
  console.log(`  Skipped (duplicate in file): ${stats.skippedDuplicateInFile}`);
  console.log(`  Skipped (already imported): ${stats.skippedAlreadyImported}`);
  console.log(`  Failed rows: ${stats.failedRows}`);
}
