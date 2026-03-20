import { describe, it, expect, beforeEach } from "vitest";
import { type Router } from "vue-router";
import { RouteNames } from "@/router/routeNames";
import { i18n } from "@/i18n";

// ─── Setup ────────────────────────────────────────────────────────────────────
//
// We recreate the router with the real routes but use createMemoryHistory()
// to avoid needing a real browser. The navigation guard logic is re-registered
// by importing it from the router module directly.
//
// Note: we import the real router instance so the beforeEach guard is active.
// Using a fresh router would skip the guard entirely.

async function navigate(router: Router, path: string) {
  await router.push(path);
  await router.isReady();
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("router/index.ts — navigation guard", () => {
  let router: Router;

  beforeEach(async () => {
    // Import the real router so the beforeEach guard is registered
    const mod = await import("@/router/index");
    router = mod.router;

    localStorage.clear();
    await navigate(router, "/nl");
  });

  // ── Locale sync ────────────────────────────────────────────────────────────
  // Verifies that i18n.global.locale is synced with the :lang param in the URL.

  describe("locale sync", () => {
    it("sets i18n locale to nl when navigating to /nl", async () => {
      await navigate(router, "/nl");
      expect(i18n.global.locale.value).toBe("nl");
    });

    it("sets i18n locale to fr when navigating to /fr", async () => {
      await navigate(router, "/fr");
      expect(i18n.global.locale.value).toBe("fr");
    });

    it("sets i18n locale to en when navigating to /en", async () => {
      await navigate(router, "/en");
      expect(i18n.global.locale.value).toBe("en");
    });

    it.each(["nl", "fr", "en"] as const)(
      "syncs i18n locale to '%s' on navigation",
      async (lang) => {
        await navigate(router, `/${lang}`);
        expect(i18n.global.locale.value).toBe(lang);
      },
    );
  });

  // ── Lang prefix redirect ───────────────────────────────────────────────────
  // Verifies that routes without a language prefix are redirected to the
  // correct language (e.g. /productions → /nl/productions).

  describe("lang prefix redirect", () => {
    it("redirects /productions to /{lang}/productions", async () => {
      localStorage.setItem("preferred-lang", "nl");
      await navigate(router, "/productions");
      expect(router.currentRoute.value.path).toBe("/nl/productions");
    });

    it("redirects /productions to the detected language", async () => {
      localStorage.setItem("preferred-lang", "fr");
      await navigate(router, "/productions");
      expect(router.currentRoute.value.path).toBe("/fr/productions");
    });

    it("does not redirect a truly non-existing route", async () => {
      await navigate(router, "/this-does-not-exist");
      expect(router.currentRoute.value.name).toBe(RouteNames.NOT_FOUND);
    });
  });

  // ── Admin guard ────────────────────────────────────────────────────────────
  // Verifies that routes with requiresAdmin: true redirect non-admin users
  // back to the home page.

  describe("admin guard", () => {
    it("redirects non-admin users away from the CMS route", async () => {
      await navigate(router, "/nl/admin/cms");
      // checkUserIsAdmin() is hardcoded to false, so should redirect to /nl
      expect(router.currentRoute.value.path).toBe("/nl");
    });

    it("redirects to the correct language home when blocking admin access", async () => {
      await navigate(router, "/fr/admin/cms");
      expect(router.currentRoute.value.path).toBe("/fr");
    });

    it("does not redirect regular routes for non-admin users", async () => {
      await navigate(router, "/nl/productions");
      expect(router.currentRoute.value.name).toBe(RouteNames.PRODUCTIONS);
    });
  });
});
