/**
 * @file Date & time formatting utilities.
 *
 * All functions are pure — they take a `Date` (or date string) and return a
 * formatted string. No side effects, no global state.
 *
 * The default locale is `"nl-BE"` (Belgian Dutch), matching the primary
 * language of the archive. Every function accepts an optional `locale`
 * parameter so the caller can override this.
 *
 * Usage:
 * ```ts
 * import { formatDate, formatTime, formatDateRange } from "@/utils/date";
 *
 * formatDate(event.starts_at);                        // "zaterdag 12 april 2025"
 * formatTime(event.starts_at);                        // "20:00"
 * formatDateRange(event.starts_at, event.ends_at);    // "za 12 apr – zo 13 apr 2025"
 * ```
 */

const DEFAULT_LOCALE = "nl-BE";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Ensures `value` is a `Date` instance.
 * Accepts `Date`, ISO 8601 strings, and timestamps.
 */
function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

/**
 * Formats a date as a long, human-readable string including the weekday.
 *
 * @param date   The date to format.
 * @param locale BCP 47 locale string (defaults to `"nl-BE"`).
 * @returns      E.g. `"zaterdag 12 april 2025"`.
 *
 * @example
 * formatDate(new Date("2025-04-12")); // → "zaterdag 12 april 2025"
 */
export function formatDate(
  date: Date | string | number,
  locale: string = DEFAULT_LOCALE,
): string {
  return toDate(date).toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Formats a date as a short string without the weekday.
 *
 * @param date   The date to format.
 * @param locale BCP 47 locale string (defaults to `"nl-BE"`).
 * @returns      E.g. `"12 apr. 2025"`.
 *
 * @example
 * formatShortDate(new Date("2025-04-12")); // → "12 apr. 2025"
 */
export function formatShortDate(
  date: Date | string | number,
  locale: string = DEFAULT_LOCALE,
): string {
  return toDate(date).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Formats a date numerically without leading zeros, using dots as separators.
 * Respects the locale's date order (e.g., DMY vs. MDY).
 *
 * @param date - The date to format.
 * @param locale - BCP 47 locale string (defaults to "nl-BE").
 * @returns Formatted date string, e.g., "8.4.2026".
 *
 * @example
 * formatNumericDate(new Date("2026-04-08"), "nl-BE"); // "8.4.2026"
 * formatNumericDate(new Date("2026-04-08"), "en-US"); // "4.8.2026"
 */
export function formatNumericDate(
  date: Date | string | number,
  locale: string = "nl-BE",
): string {
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  };

  return new Intl.DateTimeFormat(locale, options)
    .format(new Date(date))
    .replace(/[- /]/g, ".")
    .replace(/\.+/g, ".")
    .replace(/\.$/, "");
}

/**
 * Formats only the time portion of a date.
 *
 * @param date The date/time to format.
 * @returns    Zero-padded 24-hour time, e.g. `"20:00"` or `"09:30"`.
 *
 * @example
 * formatTime(new Date("2025-04-12T20:00:00")); // → "20:00"
 */
export function formatTime(date: Date | string | number): string {
  return toDate(date).toLocaleTimeString("nl-BE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Formats the doors-open time as a plain time string.
 *
 * The translated label (e.g. "Deuren open om") is intentionally not included here —
 * use `t("date.doorsOpen")` from vue-i18n in the component and concatenate with this value:
 * ```vue
 * {{ t("date.doorsOpen") }} {{ formatDoors(event.doors_at) }}
 * ```
 *
 * @param date The doors-open date/time.
 * @returns    Zero-padded 24-hour time, e.g. `"19:30"`.
 *
 * @example
 * formatDoors(new Date("2025-04-12T19:30:00")); // → "19:30"
 */
export function formatDoors(date: Date | string | number): string {
  return formatTime(date);
}

/**
 * Formats a start/end pair as a concise range string.
 *
 * - **Same day:** shows only the times, e.g. `"20:00 – 22:30"`.
 * - **Different days:** shows short dates with the year on the last item,
 *   e.g. `"za 12 apr – zo 13 apr 2025"`.
 *
 * @param start  Start date/time.
 * @param end    End date/time.
 * @param locale BCP 47 locale string (defaults to `"nl-BE"`).
 * @returns      A formatted range string.
 *
 * @example
 * // Same day
 * formatDateRange(
 *   new Date("2025-04-12T20:00:00"),
 *   new Date("2025-04-12T22:00:00"),
 * ); // → "20:00 – 22:00"
 *
 * // Different days
 * formatDateRange(
 *   new Date("2025-04-12T20:00:00"),
 *   new Date("2025-04-13T00:30:00"),
 * ); // → "za 12 apr – zo 13 apr 2025"
 */
export function formatDateRange(
  start: Date | string | number,
  end: Date | string | number,
  locale: string = DEFAULT_LOCALE,
): string {
  const s = toDate(start);
  const e = toDate(end);

  const sameDay =
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth() &&
    s.getDate() === e.getDate();

  if (sameDay) {
    return `${formatTime(s)} – ${formatTime(e)}`;
  }

  const formatShort = (d: Date) =>
    d.toLocaleDateString(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

  const endYear = e.toLocaleDateString(locale, { year: "numeric" });
  return `${formatShort(s)} – ${formatShort(e)} ${endYear}`;
}

/**
 * Formats a full event block: date, time range, and doors.
 * Useful when you want to show all event timing in one string.
 *
 * The translated doors label must be passed in from the component via `t("date.doorsOpen")`:
 * ```vue
 * formatEventBlock(event.starts_at, event.ends_at, event.doors_at, t("date.doorsOpen"))
 * ```
 *
 * @param startsAt   The performance start time.
 * @param endsAt     The performance end time.
 * @param doorsAt    The doors-open time.
 * @param doorsLabel The translated label for the doors time, e.g. `"Deuren open om"`.
 * @param locale     BCP 47 locale string (defaults to `"nl-BE"`).
 * @returns          E.g. `"zaterdag 12 april 2025 · 20:00 – 22:00 · Deuren open om 19:30"`.
 *
 * @example
 * formatEventBlock(event.starts_at, event.ends_at, event.doors_at, t("date.doorsOpen"));
 */
export function formatEventBlock(
  startsAt: Date | string | number,
  endsAt: Date | string | number,
  doorsAt: Date | string | number,
  doorsLabel: string,
  locale: string = DEFAULT_LOCALE,
): string {
  const date = formatDate(startsAt, locale);
  const range = formatDateRange(startsAt, endsAt, locale);
  const doors = `${doorsLabel} ${formatDoors(doorsAt)}`;
  return `${date} · ${range} · ${doors}`;
}

// ---------------------------------------------------------------------------
// Predicates
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the date is in the future relative to the current time.
 * Useful for filtering upcoming events out of a list.
 *
 * @param date The date to check.
 *
 * @example
 * const upcoming = events.filter((e) => isUpcoming(e.starts_at));
 */
export function isUpcoming(date: Date | string | number): boolean {
  return toDate(date).getTime() > Date.now();
}

/**
 * Returns `true` when the date is in the past relative to the current time.
 *
 * @param date The date to check.
 *
 * @example
 * const past = events.filter((e) => isPast(e.ends_at));
 */
export function isPast(date: Date | string | number): boolean {
  return toDate(date).getTime() < Date.now();
}

/**
 * Returns `true` when the current time falls between `start` and `end`.
 * Useful for marking an event as "happening now".
 *
 * @param start The start date/time.
 * @param end   The end date/time.
 *
 * @example
 * const live = events.filter((e) => isOngoing(e.starts_at, e.ends_at));
 */
export function isOngoing(
  start: Date | string | number,
  end: Date | string | number,
): boolean {
  const now = Date.now();
  return toDate(start).getTime() <= now && now <= toDate(end).getTime();
}
