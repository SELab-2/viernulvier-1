import { readFile } from "node:fs/promises";

import { ARCHIVE_TIME_ZONE, formatYmdInTimeZone, startOfCalendarDayUtc } from "@/scraper/entities/index.js";
import type { ViernulvierEventStartBounds } from "@/scraper/entities/index.js";

import { resolveScrapeStatsOutputPath } from "./scrape-stats.js";

/**
 * Parse bounds from the second line of stats report: "Events window: %window (after=date before=date)".
 * Returns the before date (upper bound) for use as lower bound in next run.
 */
export function extractBoundsFromStatsReport(report: string): Date | null {
  const lines = report.split("\n");
  if (lines.length < 2) {
    return null;
  }
  const secondLine = lines[1];
  if (!secondLine) return null;

  const match = secondLine.match(/before=(\d{4}-\d{2}-\d{2}T[\d:\.Z]+)/);
  if (match?.[1]) {
    try {
      return new Date(match[1]);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Read the previous run's stats file and extract the upper bound (before date)
 * to use as the lower bound for the next incremental scrape.
 */
export async function getLastRunUpperBound(): Promise<Date | null> {
  try {
    const statsPath = resolveScrapeStatsOutputPath();
    const report = await readFile(statsPath, "utf8");
    return extractBoundsFromStatsReport(report);
  } catch {
    return null;
  }
}

/**
 * Half-open interval [N days ago, now) in {@link ARCHIVE_TIME_ZONE}.
 * Configurable number of days.
 */
export function pastNDaysBounds(numDays: number): ViernulvierEventStartBounds {
  const tz = ARCHIVE_TIME_ZONE;
  const todayYmd = formatYmdInTimeZone(new Date(), tz);
  const before = startOfCalendarDayUtc(todayYmd, tz);
  const pastYmd = formatYmdInTimeZone(
    new Date(before.getTime() - numDays * 24 * 60 * 60 * 1000),
    tz,
  );
  const after = startOfCalendarDayUtc(pastYmd, tz);
  return { after, before };
}

/**
 * Get today's midnight (start of calendar day) in {@link ARCHIVE_TIME_ZONE}.
 */
function getTodayMidnightUtc(): Date {
  const tz = ARCHIVE_TIME_ZONE;
  const todayYmd = formatYmdInTimeZone(new Date(), tz);
  return startOfCalendarDayUtc(todayYmd, tz);
}

/**
 * Parse CLI arguments and resolve the event scrape bounds.
 *
 * Mode:
 * - `historical` (default): `{ before: today's midnight }` — past performances only (per API semantics).
 * - `last`: lower bound from last run's upper bound, upper bound is today's midnight.
 * - `days <N>`: events from N days ago to today's midnight (half-open interval).
 */
export async function resolveScrapeBoundsFromArgs(): Promise<{
  bounds: ViernulvierEventStartBounds;
  label: string;
}> {
  const args = process.argv.slice(2);
  const todayMidnight = getTodayMidnightUtc();

  // Default to historical
  if (args.length === 0) {
    return { bounds: { before: todayMidnight }, label: "historical" };
  }

  const mode = args[0];

  if (mode === "historical") {
    return { bounds: { before: todayMidnight }, label: "historical" };
  }

  if (mode === "last") {
    const lastBefore = await getLastRunUpperBound();
    if (!lastBefore) {
      console.warn("Could not read last run bounds; falling back to historical mode");
      return { bounds: { before: todayMidnight }, label: "historical (fallback)" };
    }
    return {
      bounds: { after: lastBefore, before: todayMidnight },
      label: `last (since ${lastBefore.toISOString()})`,
    };
  }

  if (mode === "days") {
    if (args.length < 2) {
      throw new Error("Error: days mode requires a number argument: 'days <N>'");
    }
    const numDays = parseInt(args[1]!, 10);
    if (isNaN(numDays) || numDays <= 0) {
      throw new Error(`Error: invalid number of days: ${args[1]}`);
    }
    const bounds = pastNDaysBounds(numDays);
    return {
      bounds,
      label: `past-${numDays}-days`,
    };
  }

  throw new Error(
    `Error: unknown mode '${mode}'. Use: historical | last | days <N>`,
  );
}
