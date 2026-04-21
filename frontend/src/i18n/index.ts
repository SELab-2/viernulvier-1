import { createI18n } from "vue-i18n";
import nl from "./locales/nl";
import en from "./locales/en";
import fr from "./locales/fr";

export const SUPPORTED_LANGS = ["nl", "fr", "en"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];
export const DEFAULT_LANG: SupportedLang = "nl";

const STORAGE_KEY = "preferred-lang";

/**
 * Detects the preferred language in order of priority:
 * 1. localStorage (previously saved user preference)
 * 2. Browser language (e.g. "nl-BE" → "nl")
 * 3. Default language fallback
 */
export function detectLanguage(): SupportedLang {
  // 1. localStorage (saved user preference)
  const stored = localStorage.getItem(STORAGE_KEY) as SupportedLang;
  if (stored && SUPPORTED_LANGS.includes(stored as SupportedLang)) {
    return stored as SupportedLang;
  }

  // 2. browser language
  const browserLang = navigator.language.split("-")[0];
  if (SUPPORTED_LANGS.includes(browserLang as SupportedLang)) {
    return browserLang as SupportedLang;
  }

  // 3. fallback default language
  return DEFAULT_LANG;
}

/**
 * Saves the user's language preference to localStorage
 * so it can be restored on the next visit.
 */
export function saveLanguagePreference(lang: SupportedLang): void {
  localStorage.setItem(STORAGE_KEY, lang);
}

/** The global vue-i18n instance. Import `i18n` to access or change the active locale. */
export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LANG,
  fallbackLocale: "nl",
  messages: { nl, fr, en },
});
