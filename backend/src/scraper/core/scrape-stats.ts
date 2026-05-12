import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { ViernulvierEventStartBounds } from "@/scraper/entities/index.js";

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

export type MediaRunStats = {
  media_created: number;
  media_existing: number;
  media_skipped: number;
};

export type CropRunStats = {
  crop_created: number;
  crop_existing: number;
  crop_skipped: number;
};

export type ScrapeRunStats = {
  startTime: Date;
  events: EventSliceRunStats;
  halls: LazyEntityRunStats;
  productions: LazyEntityRunStats;
  tags: TagRunStats;
  media_created?: number;
  media_existing?: number;
  media_skipped?: number;
  crop_created?: number;
  crop_existing?: number;
  crop_skipped?: number;
  errors?: number;
};

export function createEmptyRunStats(): ScrapeRunStats {
  return {
    startTime: new Date(),
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
    media_created: 0,
    media_existing: 0,
    media_skipped: 0,
    crop_created: 0,
    crop_existing: 0,
    crop_skipped: 0,
    errors: 0,
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
  
  const endTime = new Date();
  const elapsedMs = endTime.getTime() - stats.startTime.getTime();
  const elapsedSec = Math.round(elapsedMs / 1000);
  const elapsedMin = Math.floor(elapsedSec / 60);
  const remainingSec = elapsedSec % 60;
  const elapsedStr = elapsedMin > 0 
    ? `${elapsedMin}m ${remainingSec}s` 
    : `${elapsedSec}s`;
  
  const lines = [
    `Scraper run — started ${stats.startTime.toISOString()}, ended ${endTime.toISOString()} (${elapsedStr})`,
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
    "Images (from production galleries):",
    `  Created: ${stats.media_created ?? 0}`,
    `  Already in database (reuse): ${stats.media_existing ?? 0}`,
    `  Skipped: ${stats.media_skipped ?? 0}`,
    "",
    "Crops (uploaded to Garage):",
    `  Created: ${stats.crop_created ?? 0}`,
    `  Already in database (reuse): ${stats.crop_existing ?? 0}`,
    `  Skipped: ${stats.crop_skipped ?? 0}`,
    "",
  ];
  
  if ((stats.errors ?? 0) > 0) {
    lines.push(`Errors encountered: ${stats.errors}`);
    lines.push("");
  }

  return lines.join("\n");
}

export function scraperVerbose(): boolean {
  const v = process.env["SCRAPE_VERBOSE"]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** Repo root (`viernulvier/`), from `backend/src/scraper/*.ts`. */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/**
 * Where to write {@link formatRunReport} output. Override with `SCRAPE_STATS_FILE` (absolute or relative to cwd).
 * Default file: `backend/out/last-scrape-stats.log` (see repo `.gitignore`).
 */
export function resolveScrapeStatsOutputPath(): string {
  const fromEnv = process.env["SCRAPE_STATS_FILE"]?.trim();
  if (fromEnv !== undefined && fromEnv !== "") {
    return path.isAbsolute(fromEnv) ? fromEnv : path.join(process.cwd(), fromEnv);
  }
  return path.join(repoRoot, "backend", "out", "last-scrape-stats.log");
}

export async function writeRunReportFile(report: string, filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${report}\n`, "utf8");
}
