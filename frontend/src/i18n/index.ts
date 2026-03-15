import { createI18n } from "vue-i18n";
import nl from "./locales/nl";
import en from "./locales/en";
import fr from "./locales/fr";

export const SUPPORTED_LANGS = ["nl", "fr", "en"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];
export const DEFAULT_LANG: SupportedLang = "nl";

export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LANG,
  fallbackLocale: "nl",
  messages: { nl, fr, en },
});
