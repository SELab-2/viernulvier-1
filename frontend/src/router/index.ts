import { createRouter, createWebHistory } from "vue-router";
import { routes } from "./routes";
import { RouteNames } from "./routeNames";
import {
  i18n,
  SUPPORTED_LANGS,
  DEFAULT_LANG,
  type SupportedLang,
} from "../i18n";

export function detectLanguage(): SupportedLang {
  const browserLang = navigator.language.split("-")[0]; // "nl-BE" -> "nl"
  return SUPPORTED_LANGS.includes(browserLang as SupportedLang)
    ? (browserLang as SupportedLang)
    : DEFAULT_LANG;
}

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _, next) => {
  if (to.name === RouteNames.NOT_FOUND) {
    return next();
  }
  // redirect to default language if no lang param is present, /productions -> /nl/productions
  if (!to.params.lang) {
    const lang = detectLanguage();
    return next(`/${lang}${to.path}`);
  }

  const lang = to.params.lang as SupportedLang;

  // set i18n locale
  i18n.global.locale.value = lang;

  // check admin access for CMS route
  if (to.meta.requiresAdmin && !checkUserIsAdmin()) {
    return next({ name: RouteNames.HOME, params: { lang } });
  }

  next();
});

function checkUserIsAdmin(): boolean {
  // auth logic
  return false; // currently hardcoded to false
}

export default router;
