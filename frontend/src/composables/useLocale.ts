import { useRoute, useRouter } from "vue-router";
import {
  i18n,
  saveLanguagePreference,
  type SupportedLang,
} from "@/i18n";

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

    const routeLang = typeof route.params.lang === "string" ? route.params.lang : null;

    // Preferred path: preserve current route record + params/query/hash, only swap `lang`.
    if (route.name && routeLang) {
      void router.push({
        name: route.name,
        params: { ...route.params, lang },
        query: route.query,
        hash: route.hash,
      });
      return;
    }

    // Fallback for routes without a `lang` param (e.g. "/" before guard redirect).
    const path = route.path === "/" ? `/${lang}` : `/${lang}${route.path}`;
    void router.push({
      path,
      query: route.query,
      hash: route.hash,
    });
  }

  return { setLocale };
}
