import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { defineComponent } from "vue";
import { useLocale } from "@/composables/useLocale";
import { i18n } from "@/i18n";
import { routes } from "@/router/routes";

// ─── Wrapper component ────────────────────────────────────────────────────────
//
// useLocale() calls useRouter() and useRoute() internally, which require an
// active Vue component context. A minimal wrapper component provides that
// context and exposes setLocale() via the component instance.

function createWrapper(router: Router) {
  const TestComponent = defineComponent({
    setup() {
      return useLocale();
    },
    template: "<div />",
  });

  return mount(TestComponent, {
    global: { plugins: [router, i18n] },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useLocale — setLocale()", () => {
  let router: Router;

  beforeEach(async () => {
    router = createRouter({
      history: createMemoryHistory(),
      routes,
    });

    // Start on /nl by default
    await router.push("/nl");
    await flushPromises();

    // Clear localStorage to prevent tests from affecting each other
    localStorage.clear();
  });

  // ── localStorage ───────────────────────────────────────────────────────────
  // Verifies that the selected language is persisted to localStorage
  // so the user's preference is restored on the next visit.

  describe("localStorage", () => {
    it("saves the selected language to localStorage", () => {
      const wrapper = createWrapper(router);
      wrapper.vm.setLocale("fr");
      expect(localStorage.getItem("preferred-lang")).toBe("fr");
    });

    it.each(["nl", "fr", "en"] as const)(
      "saves '%s' correctly to localStorage",
      (lang) => {
        const wrapper = createWrapper(router);
        wrapper.vm.setLocale(lang);
        expect(localStorage.getItem("preferred-lang")).toBe(lang);
      },
    );

    it("overwrites a previous language preference in localStorage", () => {
      const wrapper = createWrapper(router);
      wrapper.vm.setLocale("fr");
      wrapper.vm.setLocale("en");
      expect(localStorage.getItem("preferred-lang")).toBe("en");
    });
  });

  // ── i18n locale ────────────────────────────────────────────────────────────
  // Verifies that i18n.global.locale is updated synchronously so the UI
  // reflects the new language immediately without waiting for navigation.

  describe("i18n locale", () => {
    it("updates the i18n locale to the selected language", () => {
      const wrapper = createWrapper(router);
      wrapper.vm.setLocale("fr");
      expect(i18n.global.locale.value).toBe("fr");
    });

    it.each(["nl", "fr", "en"] as const)(
      "correctly sets i18n locale to '%s'",
      (lang) => {
        const wrapper = createWrapper(router);
        wrapper.vm.setLocale(lang);
        expect(i18n.global.locale.value).toBe(lang);
      },
    );
  });

  // ── Router navigation ──────────────────────────────────────────────────────
  // Verifies that setLocale() replaces the language prefix in the URL
  // while preserving the rest of the path (e.g. /nl/productions → /fr/productions).

  describe("router navigatie", () => {
    it("navigates to the new language path from /nl", async () => {
      const wrapper = createWrapper(router);
      wrapper.vm.setLocale("fr");
      await flushPromises();
      expect(router.currentRoute.value.path).toBe("/fr");
    });

    it("preserves the subpath when switching language", async () => {
      await router.push("/nl/productions");
      const wrapper = createWrapper(router);
      wrapper.vm.setLocale("fr");
      await flushPromises();
      expect(router.currentRoute.value.path).toBe("/fr/productions");
    });

    it("preserves a nested subpath with id when switching language", async () => {
      await router.push("/nl/productions/42");
      const wrapper = createWrapper(router);
      wrapper.vm.setLocale("en");
      await flushPromises();
      expect(router.currentRoute.value.path).toBe("/en/productions/42");
    });

    it("navigates correctly when the path has no language prefix", async () => {
      // Covers the else branch: pathWithoutLang = route.path
      await router.push("/");
      const wrapper = createWrapper(router);
      wrapper.vm.setLocale("nl");
      await flushPromises();
      expect(router.currentRoute.value.path).toBe("/nl");
    });

    it.each(["nl", "fr", "en"] as const)(
      "navigates correctly to /%s from /nl",
      async (lang) => {
        const wrapper = createWrapper(router);
        wrapper.vm.setLocale(lang);
        await flushPromises();
        expect(router.currentRoute.value.path).toBe(`/${lang}`);
      },
    );
  });

  // ── All together ───────────────────────────────────────────────────────────
  // Verifies that all three side effects fire correctly in a single setLocale() call.

  describe("alles synchroon", () => {
    it("syncs localStorage, i18n and router in a single setLocale() call", async () => {
      const wrapper = createWrapper(router);
      wrapper.vm.setLocale("en");
      await flushPromises();

      expect(localStorage.getItem("preferred-lang")).toBe("en");
      expect(i18n.global.locale.value).toBe("en");
      expect(router.currentRoute.value.path).toBe("/en");
    });
  });
});
