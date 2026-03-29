import { describe, it, expect, beforeEach } from "vitest";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { routes } from "@/router/routes";
import { RouteNames } from "@/router/routeNames";

// ─── Setup ────────────────────────────────────────────────────────────────────
//
// A fresh router is created for each test using createMemoryHistory() so tests
// are isolated and do not share navigation state. No guards are registered here
// — this file tests route definitions only, not guard behaviour.

function createTestRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("router/routes.ts", () => {
  let router: Router;

  beforeEach(() => {
    router = createTestRouter();
  });

  // ── Home ───────────────────────────────────────────────────────────────────

  describe("home route", () => {
    it.each(["nl", "fr", "en"] as const)(
      "/%s resolves to HOME",
      async (lang) => {
        await router.push(`/${lang}`);
        expect(router.currentRoute.value.name).toBe(RouteNames.HOME);
      },
    );

    it.each(["nl", "fr", "en"] as const)(
      "/%s sets the lang param correctly",
      async (lang) => {
        await router.push(`/${lang}`);
        expect(router.currentRoute.value.params.lang).toBe(lang);
      },
    );
  });

  // ── Productions ────────────────────────────────────────────────────────────

  describe("productions route", () => {
    it.each(["nl", "fr", "en"] as const)(
      "/%s/productions resolves to PRODUCTIONS",
      async (lang) => {
        await router.push(`/${lang}/productions`);
        expect(router.currentRoute.value.name).toBe(RouteNames.PRODUCTIONS);
      },
    );
  });

  // ── Production detail ──────────────────────────────────────────────────────

  describe("production detail route", () => {
    it.each(["nl", "fr", "en"] as const)(
      "/%s/productions/:id resolves to PRODUCTION_DETAIL",
      async (lang) => {
        await router.push(`/${lang}/productions/42`);
        expect(router.currentRoute.value.name).toBe(
          RouteNames.PRODUCTION_DETAIL,
        );
      },
    );

    it("exposes the id as a route param", async () => {
      await router.push("/nl/productions/42");
      expect(router.currentRoute.value.params.id).toBe("42");
    });

    it("has props: true so the id param is passed as a component prop", () => {
      const route = router.resolve("/nl/productions/42");
      // props: true means matched route record has props set to true
      expect(route.matched[1]?.props.default).toBe(true);
    });
  });

  // ── Admin ──────────────────────────────────────────────────────────────────

  describe("admin CMS route", () => {
    it.each(["nl", "fr", "en"] as const)(
      "/%s/admin/cms resolves to CMS",
      async (lang) => {
        await router.push(`/${lang}/admin/cms`);
        expect(router.currentRoute.value.name).toBe(RouteNames.CMS);
      },
    );

    it("has requiresAdmin: true in meta", async () => {
      await router.push("/nl/admin/cms");
      expect(router.currentRoute.value.meta.requiresAdmin).toBe(true);
    });
  });

  // ── Lang param validation ──────────────────────────────────────────────────
  // The /:lang(nl|fr|en) regex constraint must reject unsupported languages.

  describe("lang param validation", () => {
    it("rejects an unsupported language prefix like /de", async () => {
      await router.push("/de");
      expect(router.currentRoute.value.name).toBe(RouteNames.NOT_FOUND);
    });

    it("rejects /de/productions and falls through to NOT_FOUND", async () => {
      await router.push("/de/productions");
      expect(router.currentRoute.value.name).toBe(RouteNames.NOT_FOUND);
    });
  });

  // ── 404 ────────────────────────────────────────────────────────────────────

  describe("404 route", () => {
    it("catches completely unknown paths", async () => {
      await router.push("/this/does/not/exist");
      expect(router.currentRoute.value.name).toBe(RouteNames.NOT_FOUND);
    });

    it("catches unknown paths with a valid lang prefix", async () => {
      await router.push("/nl/unknown-page");
      expect(router.currentRoute.value.name).toBe(RouteNames.NOT_FOUND);
    });

    it("home routes do not have requiresAdmin in meta", async () => {
      await router.push("/nl");
      expect(router.currentRoute.value.meta.requiresAdmin).toBeFalsy();
    });
  });
});
