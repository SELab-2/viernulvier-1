/**
 * @file Miscellaneous utilities — general-purpose helpers that don't belong
 * to a specific domain (i18n, dates, forms).
 *
 * All functions are pure or side-effect-free unless otherwise noted.
 *
 * Usage:
 * ```ts
 * import { debounce, groupBy, buildQueryString } from "@/utils/misc";
 * ```
 */

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

/**
 * Builds a URL query string from a plain object, omitting keys whose value
 * is `null`, `undefined`, or an empty string.
 *
 * Returns the string **without** a leading `?` so it can be used with both
 * `fetch` and `URL` construction.
 *
 * @param params Object of query parameters.
 * @returns      URL-encoded query string, or `""` when all values are empty.
 *
 * @example
 * buildQueryString({ page: 1, q: "hamlet", lang: null });
 * // → "page=1&q=hamlet"
 *
 * // Using with apiFetch:
 * const qs = buildQueryString({ tag: 3, year: 2025 });
 * const url = qs ? `/production?${qs}` : "/production";
 * const productions = await apiFetch<Production[]>(url);
 */
export function buildQueryString(
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );
  return new URLSearchParams(
    entries.map(([k, v]) => [k, String(v)]),
  ).toString();
}

// ---------------------------------------------------------------------------
// Function utilities
// ---------------------------------------------------------------------------

/**
 * Returns a debounced version of `fn` that delays invocation until `delay`
 * milliseconds have passed since the last call.
 *
 * Useful for search inputs and resize handlers where you want to avoid
 * firing on every keystroke.
 *
 * @param fn    The function to debounce.
 * @param delay Delay in milliseconds.
 * @returns     A debounced wrapper. Call `.cancel()` to cancel a pending call.
 *
 * @example
 * const search = debounce(async (query: string) => {
 *   results.value = await searchProductions(query);
 * }, 300);
 *
 * // In a Vue template:
 * // <input @input="search($event.target.value)" />
 */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number,
): ((...args: Args) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const debounced = (...args: Args): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, delay);
  };

  debounced.cancel = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  return debounced;
}

// ---------------------------------------------------------------------------
// Array utilities
// ---------------------------------------------------------------------------

/**
 * Groups an array of objects by the value of a specific key, returning a
 * `Map` that preserves insertion order.
 *
 * @param items Array of objects to group.
 * @param key   The key to group by.
 * @returns     `Map<KeyType, Item[]>` — one entry per distinct key value.
 *
 * @example
 * // Group events by production ID
 * const byProduction = groupBy(events, "production");
 * byProduction.get(42); // → [Event, Event, …]
 *
 * // Group tags by their type ID
 * const byType = groupBy(tags, "type");
 */
export function groupBy<T, K extends keyof T>(
  items: T[],
  key: K,
): Map<T[K], T[]> {
  const map = new Map<T[K], T[]>();
  for (const item of items) {
    const k = item[key];
    const group = map.get(k);
    if (group !== undefined) {
      group.push(item);
    } else {
      map.set(k, [item]);
    }
  }
  return map;
}

/**
 * Returns a new array with duplicate values removed, preserving the first
 * occurrence of each value.
 *
 * @param items Array that may contain duplicates.
 * @returns     Array with unique values only.
 *
 * @example
 * unique([1, 2, 2, 3, 1]); // → [1, 2, 3]
 */
export function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

/**
 * Returns a new array with duplicate objects removed, comparing by the value
 * of a specific key.
 *
 * @param items Array of objects that may contain duplicates.
 * @param key   The key whose value is used for uniqueness comparison.
 * @returns     Array containing only the first object for each distinct key value.
 *
 * @example
 * // Deduplicate productions by ID
 * uniqueBy(productions, "id");
 */
export function uniqueBy<T, K extends keyof T>(items: T[], key: K): T[] {
  const seen = new Set<T[K]>();
  return items.filter((item) => {
    if (seen.has(item[key])) return false;
    seen.add(item[key]);
    return true;
  });
}

/**
 * Sorts an array of objects by a numeric or string key in ascending order.
 * Returns a **new array** — the original is not mutated.
 *
 * @param items Array of objects to sort.
 * @param key   The key to sort by.
 * @returns     A new sorted array.
 *
 * @example
 * sortBy(events, "starts_at");
 * sortBy(productions, "vendor_id");
 */
export function sortBy<T>(items: T[], key: keyof T): T[] {
  return [...items].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av < bv) return -1;
    if (av > bv) return 1;
    return 0;
  });
}

// ---------------------------------------------------------------------------
// Object utilities
// ---------------------------------------------------------------------------

/**
 * Creates a lookup map (`Record<id, T>`) from an array of objects that have
 * a numeric `id` field. This allows O(1) lookups instead of repeated
 * `Array.find()` calls.
 *
 * @param items Array of objects with a numeric `id` field.
 * @returns     Record keyed by `id`.
 *
 * @example
 * const hallMap = indexById(halls);
 * const hall = hallMap[event.hall]; // O(1)
 */
export function indexById<T extends { id: number }>(
  items: T[],
): Record<number, T> {
  const record: Record<number, T> = {};
  for (const item of items) {
    record[item.id] = item;
  }
  return record;
}
