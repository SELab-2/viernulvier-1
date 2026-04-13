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
 * Use with external `aanvang[after]` / `aanvang[before]` for a nightly “archive what left the site” job.
 */
export function previousBrusselsDayBounds(): ViernulvierEventStartBounds {
  const tz = ARCHIVE_TIME_ZONE;
  const todayYmd = formatYmdInTimeZone(new Date(), tz);
  const before = startOfCalendarDayUtc(todayYmd, tz);
  const yesterdayYmd = formatYmdInTimeZone(new Date(before.getTime() - 1), tz);
  const after = startOfCalendarDayUtc(yesterdayYmd, tz);
  return { after, before };
}
