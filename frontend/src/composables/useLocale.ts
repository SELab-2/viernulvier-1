import { useRoute, useRouter } from "vue-router";
import {
  i18n,
  saveLanguagePreference,
  SUPPORTED_LANGS,
  type SupportedLang,
} from "@/i18n";

/**
 * Returns the path with any leading supported-language prefix stripped.
 * Used when swapping locales on routes that don't expose a `lang` param
 * (e.g. the 404 catch-all) so we don't accumulate prefixes on each switch.
 */
function stripLangPrefix(path: string): string {
  const match = path.match(/^\/([^/]+)(\/.*)?$/);
  if (match && SUPPORTED_LANGS.includes(match[1] as SupportedLang)) {
    return match[2] ?? "/";
  }
  return path;
}

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

    // Fallback for routes without a `lang` param (e.g. "/" before guard
    // redirect, or the 404 catch-all on a path like "/en/test"). Strip any
    // existing lang prefix first so repeated switches don't accumulate.
    const stripped = stripLangPrefix(route.path);
    const path = stripped === "/" ? `/${lang}` : `/${lang}${stripped}`;
    void router.push({
      path,
      query: route.query,
      hash: route.hash,
    });
  }

  return { setLocale };
}
