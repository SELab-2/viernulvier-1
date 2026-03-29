import { useRoute, useRouter } from "vue-router";
import {
  i18n,
  saveLanguagePreference,
  SUPPORTED_LANGS,
  type SupportedLang,
} from "../i18n";

/**
 * Composable for switching the application language.
 *
 * @example
 * `const { setLocale } = useLocale();`
 * `setLocale("fr");`
 */
export function useLocale() {
  const router = useRouter();
  const route = useRoute();

  /**
   * Switches the active language and keeps three things in sync:
   * 1. `localStorage` — remembers the user's preference for next visit
   * 2. `vue-i18n` — updates translations reactively across all components
   * 3. The URL — replaces the language prefix (e.g. `/nl/productions` → `/fr/productions`)
   *
   * @param lang - The language to switch to (e.g. "nl", "fr", "en")
   */
  function setLocale(lang: SupportedLang): void {
    saveLanguagePreference(lang);
    i18n.global.locale.value = lang;

    // replace current path with same path but new lang prefix
    const currentLang = SUPPORTED_LANGS.find((l) =>
      route.path.startsWith(`/${l}`),
    );
    const pathWithoutLang = currentLang
      ? route.path.substring(currentLang.length + 1) // "/nl/productions" → "/productions"
      : ""; // only reachable from "/", always results in "/[lang]"

    void router.push(`/${lang}${pathWithoutLang}`);
  }

  return { setLocale };
}
