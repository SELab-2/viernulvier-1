import { createRouter, createWebHistory } from "vue-router";
import { routes } from "./routes";
import { RouteNames } from "./routeNames";
import { i18n, type SupportedLang, detectLanguage } from "../i18n";

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _, next) => {
  // check if non existing route would exist with a lang prefix
  if (to.name === RouteNames.NOT_FOUND) {
    const lang = detectLanguage();
    const pathWithLang = `/${lang}${to.path}`;
    const matchedRoute = router.resolve(pathWithLang);

    // if route exists with lang prefix, redirect there (bv. /productions → /nl/productions)
    if (matchedRoute.name !== RouteNames.NOT_FOUND) {
      return next(pathWithLang);
    }

    // else, route truly doesn't exist, proceed to 404
    return next();
  }

  // set locale based on route param
  i18n.global.locale.value = to.params.lang as SupportedLang;

  // check admin access for routes that require it
  if (to.meta.requiresAdmin && !checkUserIsAdmin()) {
    return next(`/${to.params.lang}`); // redirect to home
  }

  next();
});

function checkUserIsAdmin(): boolean {
  // auth logic
  return false; // currently hardcoded to false
}

export default router;
