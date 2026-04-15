import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { ViernulvierEventStartBounds } from "./event-bounds.js";

/**
 * Counters for lazy hall / production resolution during an event-first scrape.
 */
export type LazyEntityRunStats = {
  created: number;
  reusedExisting: number;
};

export type EventSliceRunStats = {
  seen: number;
  imported: number;
  skippedAlreadyImported: number;
  skippedMissingStartsAt: number;
  skippedInvalidEventId: number;
  skippedInvalidHallRef: number;
  skippedInvalidProductionRef: number;
  failed: number;
};

export type ScrapeRunStats = {
  events: EventSliceRunStats;
  halls: LazyEntityRunStats;
  productions: LazyEntityRunStats;
};

export function createEmptyRunStats(): ScrapeRunStats {
  return {
    events: {
      seen: 0,
      imported: 0,
      skippedAlreadyImported: 0,
      skippedMissingStartsAt: 0,
      skippedInvalidEventId: 0,
      skippedInvalidHallRef: 0,
      skippedInvalidProductionRef: 0,
      failed: 0,
    },
    halls: { created: 0, reusedExisting: 0 },
    productions: { created: 0, reusedExisting: 0 },
  };
}

function formatBounds(bounds: ViernulvierEventStartBounds): string {
  return `after=${bounds.after?.toISOString() ?? "—"} before=${bounds.before?.toISOString() ?? "—"}`;
}

/**
 * Human-readable report (legacy-importer style) for stdout or a file.
 */
export function formatRunReport(
  stats: ScrapeRunStats,
  opts: {
    windowLabel: string;
    bounds: ViernulvierEventStartBounds;
  },
): string {
  const { windowLabel, bounds } = opts;
  const e = stats.events;
  const lines = [
    `Scraper run — ${new Date().toISOString()}`,
    `Events window: ${windowLabel} (${formatBounds(bounds)})`,
    "",
    "Events:",
    `  Rows seen: ${e.seen}`,
    `  Imported: ${e.imported}`,
    `  Skipped (already imported): ${e.skippedAlreadyImported}`,
    `  Skipped (missing or invalid start time): ${e.skippedMissingStartsAt}`,
    `  Skipped (invalid event legacy id): ${e.skippedInvalidEventId}`,
    `  Skipped (invalid hall reference): ${e.skippedInvalidHallRef}`,
    `  Skipped (invalid production reference): ${e.skippedInvalidProductionRef}`,
    `  Failed rows: ${e.failed}`,
    "",
    "Productions (lazy, while importing events):",
    `  Created: ${stats.productions.created}`,
    `  Already in database (reuse): ${stats.productions.reusedExisting}`,
    "",
    "Halls (lazy, while importing events):",
    `  Created: ${stats.halls.created}`,
    `  Already in database (reuse): ${stats.halls.reusedExisting}`,
    "",
  ];
  return lines.join("\n");
}

export function scraperVerbose(): boolean {
  const v = process.env["SCRAPE_VERBOSE"]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

const scraperDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Where to write {@link formatRunReport} output. Override with `SCRAPE_STATS_FILE` (absolute or relative to cwd).
 */
export function resolveScrapeStatsOutputPath(): string {
  const fromEnv = process.env["SCRAPE_STATS_FILE"]?.trim();
  if (fromEnv !== undefined && fromEnv !== "") {
    return path.isAbsolute(fromEnv) ? fromEnv : path.join(process.cwd(), fromEnv);
  }
  return path.join(scraperDir, "last-scrape-stats.txt");
}

export async function writeRunReportFile(report: string, filePath: string): Promise<void> {
  await writeFile(filePath, `${report}\n`, "utf8");
}
