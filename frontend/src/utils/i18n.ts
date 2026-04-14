/**
 * @file Multilingual text utilities (i18n helpers).
 *
 * All multi-language text fields in the API are stored as a {@link LanguageMap}
 * — a plain object where each key is a language code and the value is the text
 * in that language, e.g. `{ nl: "Welkom", en: "Welcome" }`.
 *
 * Usage:
 * ```ts
 * import { localize, fillLanguageMap } from "@/utils/i18n";
 *
 * const title = localize(production.title, "nl"); // "Hamlet"
 * ```
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The three supported language codes. */
export type Language = "nl" | "en" | "fr";

/**
 * A partial record mapping language codes to strings.
 * At least one language must be present (enforced by the API schema).
 *
 * @example
 * const title: LanguageMap = { nl: "Romeo en Julia", fr: "Roméo et Juliette" };
 */
export type LanguageMap = Partial<Record<Language, string>>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** All supported languages in display order. */
export const ALL_LANGUAGES: Language[] = ["nl", "en", "fr"];

/**
 * Default fallback chain used by {@link localize} when the preferred language
 * is not available: Dutch → English → French.
 */
const FALLBACK_ORDER: Language[] = ["nl", "en", "fr"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the text for the preferred language, falling back through
 * `nl → en → fr` when the requested language is absent.
 *
 * @param map  A `LanguageMap` from the API.
 * @param lang The preferred language code.
 * @returns    The best available string, or `null` if the map is empty.
 *
 * @example
 * localize({ nl: "Welkom" }, "en");       // → "Welkom"  (nl fallback)
 * localize({ en: "Welcome" }, "en");      // → "Welcome"
 * localize({}, "nl");                     // → null
 * localize(null, "nl");                   // → null  (nullable JSON fields from the API)
 */
export function localize(
  map: LanguageMap | null | undefined,
  lang: Language,
): string | null {
  if (map === null || map === undefined) return null;
  if (map[lang] !== undefined) return map[lang] as string;

  for (const fallback of FALLBACK_ORDER) {
    if (fallback !== lang && map[fallback] !== undefined) {
      return map[fallback] as string;
    }
  }

  return null;
}

/**
 * Like {@link localize}, but returns an empty string instead of `null` when no
 * text is available. Useful for binding directly to template attributes that
 * expect a `string`.
 *
 * @param map  A `LanguageMap` from the API, or `null` when the field is unset.
 * @param lang The preferred language code.
 *
 * @example
 * localizeOrEmpty({ nl: "Welkom" }, "fr"); // → "Welkom"  (fallback)
 * localizeOrEmpty({}, "nl");               // → ""
 * localizeOrEmpty(null, "nl");            // → ""
 */
export function localizeOrEmpty(
  map: LanguageMap | null | undefined,
  lang: Language,
): string {
  return localize(map, lang) ?? "";
}

/**
 * Creates a {@link LanguageMap} with the same string set for all three
 * languages. Useful for initialising multilingual form fields with a default
 * or copied value.
 *
 * @param value The string to assign to every language.
 *
 * @example
 * fillLanguageMap("Nieuwe productie");
 * // → { nl: "Nieuwe productie", en: "Nieuwe productie", fr: "Nieuwe productie" }
 */
export function fillLanguageMap(value: string): LanguageMap {
  return Object.fromEntries(ALL_LANGUAGES.map((lang) => [lang, value]));
}

/**
 * Creates an empty {@link LanguageMap} with every language key set to `""`.
 * Useful for initialising blank multilingual form fields.
 *
 * @example
 * emptyLanguageMap(); // → { nl: "", en: "", fr: "" }
 */
export function emptyLanguageMap(): LanguageMap {
  return Object.fromEntries(ALL_LANGUAGES.map((lang) => [lang, ""]));
}

/**
 * Returns `true` when the given language has a non-empty value in the map.
 *
 * @example
 * hasLanguage({ nl: "Welkom" }, "en"); // → false
 * hasLanguage({ nl: "Welkom" }, "nl"); // → true
 */
export function hasLanguage(
  map: LanguageMap | null | undefined,
  lang: Language,
): boolean {
  if (map === null || map === undefined) return false;
  const value = map[lang];
  return value !== undefined && value.trim().length > 0;
}

/**
 * Returns all language codes that have a non-empty value in the map,
 * in the canonical order (`nl`, `en`, `fr`).
 *
 * @example
 * availableLanguages({ nl: "Welkom", fr: "" }); // → ["nl"]
 * availableLanguages({ nl: "Welkom", en: "Welcome", fr: "Bienvenue" }); // → ["nl", "en", "fr"]
 */
export function availableLanguages(
  map: LanguageMap | null | undefined,
): Language[] {
  if (map === null || map === undefined) return [];
  return ALL_LANGUAGES.filter((lang) => hasLanguage(map, lang));
}
