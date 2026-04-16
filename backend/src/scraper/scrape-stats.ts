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

/**
 * Genre/tag sync: Viernulvier `genres` → local `tag` + `production_tag`.
 */
export type TagRunStats = {
  /** New `tag` rows (`POST /api/v1/tag`). */
  tagsCreated: number;
  /** Existing tag resolved via `GET /tag/all?old_id=&tag_type=` (not created this run). */
  tagsReusedExisting: number;
  /** New `production_tag` rows (`POST /production/:id/tags` with `linked: true`). */
  linksCreated: number;
  /** `production_tag` row already existed (`linked: false`). */
  linksAlreadyPresent: number;
  /** Default `tag_type` rows created (`genre` / `tag` bootstrap). */
  tagTypesCreated: number;
  /** Genre refs not linked (bad IRI, 404, wrong `use_as`, no name, tag create/link failed). */
  genresSkipped: number;
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
  tags: TagRunStats;
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
    tags: {
      tagsCreated: 0,
      tagsReusedExisting: 0,
      linksCreated: 0,
      linksAlreadyPresent: 0,
      tagTypesCreated: 0,
      genresSkipped: 0,
    },
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
    "Tags / genres (sync with productions):",
    `  Tags created: ${stats.tags.tagsCreated}`,
    `  Tags reused (existing): ${stats.tags.tagsReusedExisting}`,
    `  Production–tag links created: ${stats.tags.linksCreated}`,
    `  Production–tag links already present: ${stats.tags.linksAlreadyPresent}`,
    `  Tag types created (bootstrap): ${stats.tags.tagTypesCreated}`,
    `  Genre refs skipped: ${stats.tags.genresSkipped}`,
    "",
  ];
  return lines.join("\n");
}

export function scraperVerbose(): boolean {
  const v = process.env["SCRAPE_VERBOSE"]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** Repo root (`viernulvier/`), from `backend/src/scraper/*.ts`. */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/**
 * Where to write {@link formatRunReport} output. Override with `SCRAPE_STATS_FILE` (absolute or relative to cwd).
 * Default file: `backend/scripts/last-scrape-stats.txt` (next to `scripts/scrape.ts`).
 */
export function resolveScrapeStatsOutputPath(): string {
  const fromEnv = process.env["SCRAPE_STATS_FILE"]?.trim();
  if (fromEnv !== undefined && fromEnv !== "") {
    return path.isAbsolute(fromEnv) ? fromEnv : path.join(process.cwd(), fromEnv);
  }
  return path.join(repoRoot, "backend", "scripts", "last-scrape-stats.txt");
}

export async function writeRunReportFile(report: string, filePath: string): Promise<void> {
  await writeFile(filePath, `${report}\n`, "utf8");
}
