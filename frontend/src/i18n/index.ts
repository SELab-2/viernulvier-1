import { createI18n } from "vue-i18n";
import nl from "./locales/nl";
import en from "./locales/en";
import fr from "./locales/fr";

export const SUPPORTED_LANGS = ["nl", "fr", "en"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];
export const DEFAULT_LANG: SupportedLang = "nl";

const STORAGE_KEY = "preferred-lang";

export function detectLanguage(): SupportedLang {
  // 1. localStorage (saved user preference)
  const stored = localStorage.getItem(STORAGE_KEY) as SupportedLang;
  if (stored && SUPPORTED_LANGS.includes(stored)) return stored;

  // 2. browser language
  const browserLang = navigator.language.split("-")[0] as SupportedLang;
  if (SUPPORTED_LANGS.includes(browserLang)) return browserLang;

  // 3. fallback default language
  return DEFAULT_LANG;
}

export function saveLanguagePreference(lang: SupportedLang): void {
  localStorage.setItem(STORAGE_KEY, lang);
}

export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LANG,
  fallbackLocale: "nl",
  messages: { nl, fr, en },
});
