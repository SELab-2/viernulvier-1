import { createRouter, createWebHistory } from "vue-router";
import { routes } from "./routes";
import { RouteNames } from "./routeNames";
import { i18n, type SupportedLang, detectLanguage } from "@/i18n";

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

/**
 * Global navigation guard that runs before every route change.
 *
 * Responsibilities:
 * 1. Redirects routes without a language prefix to the correct language (e.g. /productions → /nl/productions)
 * 2. Syncs the vue-i18n locale with the language in the URL
 * 3. Blocks access to admin routes for non-admin users
 */
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

/**
 * Checks whether the current user has admin privileges.
 * @returns `true` if the user is an admin, `false` otherwise.
 * TODO: replace with real auth logic
 */
function checkUserIsAdmin(): boolean {
  // auth logic
  return false; // currently hardcoded to false
}

export default router;
