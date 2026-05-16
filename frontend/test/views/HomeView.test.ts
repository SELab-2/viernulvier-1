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

    it("includes the hero section and the featured-blog section", () => {
      // Two editorial sections: HeroSection (masthead + search) and
      // FeaturedBlogSection (lead article). The footer is not a <section>.
      expect(wrapper.findAll("section").length).toBeGreaterThanOrEqual(2);
    });

    it("includes the footer", () => {
      expect(wrapper.find("footer").exists()).toBe(true);
    });
  });
});
