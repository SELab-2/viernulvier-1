import type { ViernulvierEventStartBounds } from "./event-bounds.js";

/** Venue and archive schedules follow local (Belgian) calendar days, not UTC midnight. */
export const ARCHIVE_TIME_ZONE = "Europe/Brussels";

export function formatYmdInTimeZone(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/**
 * First UTC instant where the clock in `timeZone` reads calendar date `ymd` (`YYYY-MM-DD`).
 */
export function startOfCalendarDayUtc(ymd: string, timeZone: string): Date {
  const [y, m, d] = ymd.split("-").map((s) => parseInt(s, 10)) as [number, number, number];
  let low = Date.UTC(y, m - 1, d - 1);
  let high = Date.UTC(y, m - 1, d + 2);
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const midYmd = formatYmdInTimeZone(new Date(mid), timeZone);
    if (midYmd < ymd) low = mid + 1;
    else high = mid;
  }
  return new Date(low);
}

/**
 * Half-open interval [start of yesterday, start of today) in {@link ARCHIVE_TIME_ZONE}.
 * Use with external `starts_at[after]` / `starts_at[before]` for a nightly “archive what left the site” job.
 */
export function previousBrusselsDayBounds(): ViernulvierEventStartBounds {
  const tz = ARCHIVE_TIME_ZONE;
  const todayYmd = formatYmdInTimeZone(new Date(), tz);
  const before = startOfCalendarDayUtc(todayYmd, tz);
  const yesterdayYmd = formatYmdInTimeZone(
    new Date(before.getTime() - 1 * 24 * 60 * 60 * 1000),
    tz
  );
  const after = startOfCalendarDayUtc(yesterdayYmd, tz);
  return { after, before };
}

/**
 * Half-open interval [7 days ago, now).
 * Captures events from the past week in chronological order.
 */
export function pastSevenDaysBounds(): ViernulvierEventStartBounds {
  const tz = ARCHIVE_TIME_ZONE;
  const todayYmd = formatYmdInTimeZone(new Date(), tz);
  const before = startOfCalendarDayUtc(todayYmd, tz);
  const sevenDaysYmd = formatYmdInTimeZone(
    new Date(before.getTime() - 7 * 24 * 60 * 60 * 1000),
    tz,
  );
  const after = startOfCalendarDayUtc(sevenDaysYmd, tz);
  return { after, before };
}

/**
 * Half-open interval [30 days ago, now).
 * Captures events from the past month in chronological order.
 */
export function pastThirtyDaysBounds(): ViernulvierEventStartBounds {
  const tz = ARCHIVE_TIME_ZONE;
  const todayYmd = formatYmdInTimeZone(new Date(), tz);
  const before = startOfCalendarDayUtc(todayYmd, tz);
  const thirtyDaysYmd = formatYmdInTimeZone(
    new Date(before.getTime() - 30 * 24 * 60 * 60 * 1000),
    tz,
  );
  const after = startOfCalendarDayUtc(thirtyDaysYmd, tz);
  return { after, before };
}