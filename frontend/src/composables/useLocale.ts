import { useRoute, useRouter } from "vue-router";
import {
  i18n,
  saveLanguagePreference,
  SUPPORTED_LANGS,
  type SupportedLang,
} from "../i18n";

export function useLocale() {
  const router = useRouter();
  const route = useRoute();

  function setLocale(lang: SupportedLang): void {
    saveLanguagePreference(lang);
    i18n.global.locale.value = lang;

    // replace current path with same path but new lang prefix
    const currentLang = SUPPORTED_LANGS.find((l) =>
      route.path.startsWith(`/${l}`),
    );
    const pathWithoutLang = currentLang
      ? route.path.substring(currentLang.length + 1) // "/nl/productions" → "/productions"
      : route.path;

    router.push(`/${lang}${pathWithoutLang}`);
  }

  return { setLocale };
}
