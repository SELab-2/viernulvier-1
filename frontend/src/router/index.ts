import { createRouter, createWebHistory } from "vue-router";
import { routes } from "./routes";
import { RouteNames } from "./routeNames";
import { i18n, type SupportedLang, detectLanguage } from "@/i18n";
import { ApiError } from "@/services/auth";
import { useAuthStore } from "@/stores/auth";

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
router.beforeEach(async (to) => {
  // check if non existing route would exist with a lang prefix
  if (to.name === RouteNames.NOT_FOUND) {
    const lang = detectLanguage();
    const pathWithLang = `/${lang}${to.path}`;
    const matchedRoute = router.resolve(pathWithLang);

    // if route exists with lang prefix, redirect there (e.g. /productions → /nl/productions)
    if (matchedRoute.name !== RouteNames.NOT_FOUND) {
      return pathWithLang;
    }

    // else, route truly doesn't exist, proceed to 404
    return true;
  }

  // set locale based on route param
  i18n.global.locale.value = to.params.lang as SupportedLang;

  // check admin access for routes that require it
  if (to.meta.requiresAdmin && !(await checkUserIsAdmin())) {
    return `/${to.params.lang}/admin/login?redirect=${encodeURIComponent(to.fullPath)}`; // redirect to login
  }
});

/**
 * Checks whether the current user has admin privileges.
 * @returns `true` if the user is an admin, `false` otherwise.
 */
async function checkUserIsAdmin(): Promise<boolean> {
  try {
    const authStore = useAuthStore();
    await authStore.fetchAdmin();
    return true;
  } catch (err) {
    if (err instanceof ApiError && err.isUnauthorized) return false;
    throw err;
  }
}

export default router;
