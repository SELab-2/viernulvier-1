import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "@/router/routes";
import { i18n } from "@/i18n";
import HomeView from "@/views/HomeView.vue";

// ─── Mock matchMedia (jsdom does not provide it) ────────────────────────────

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

async function mountHome(lang: "nl" | "fr" | "en" = "nl") {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(`/${lang}`);
  await router.isReady();

  const wrapper = mount(HomeView, {
    global: { plugins: [router, i18n] },
    attachTo: document.body,
  });

  return { wrapper, router };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("HomeView.vue", () => {
  let wrapper: Awaited<ReturnType<typeof mountHome>>["wrapper"];

  beforeEach(async () => {
    ({ wrapper } = await mountHome("nl"));
  });

  afterEach(() => {
    wrapper.unmount();
    document.body.innerHTML = "";
    document.documentElement.classList.remove("dark");
    localStorage.clear();
  });

  // ── Composition — does HomeView assemble all child components? ───────────

  describe("composition", () => {
    it("renders without errors", () => {
      expect(wrapper.exists()).toBe(true);
    });

    it("includes the navbar", () => {
      expect(wrapper.find("nav").exists()).toBe(true);
    });

    it("includes the hero section with an h1", () => {
      expect(wrapper.find("h1").exists()).toBe(true);
    });

    it("includes at least three content sections", () => {
      expect(wrapper.findAll("section").length).toBeGreaterThanOrEqual(3);
    });

    it("includes the footer", () => {
      expect(wrapper.find("footer").exists()).toBe(true);
    });
  });

  // ── Dark mode — logic owned by HomeView ──────────────────────────────────

  describe("dark mode", () => {
    function findDarkModeButton() {
      return wrapper
        .findAll("button[aria-label]")
        .find((b) => b.attributes("aria-label")?.toLowerCase().includes("dark"));
    }

    it("does not apply the dark class by default", () => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("adds the dark class on toggle", async () => {
      await findDarkModeButton()!.trigger("click");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("removes the dark class on second toggle", async () => {
      await findDarkModeButton()!.trigger("click");
      await findDarkModeButton()!.trigger("click");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("persists preference to localStorage", async () => {
      await findDarkModeButton()!.trigger("click");
      expect(localStorage.getItem("viernulvier-dark")).toBe("true");
      await findDarkModeButton()!.trigger("click");
      expect(localStorage.getItem("viernulvier-dark")).toBe("false");
    });

    it("restores preference from localStorage on mount", async () => {
      wrapper.unmount();
      document.documentElement.classList.remove("dark");
      localStorage.setItem("viernulvier-dark", "true");
      const { wrapper: w2 } = await mountHome("nl");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      w2.unmount();
    });
  });
});
