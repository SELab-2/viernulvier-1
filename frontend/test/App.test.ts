import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "@/router/routes";
import { i18n } from "@/i18n";
import HomeView from "@/views/HomeView.vue";

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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("HomeView.vue", () => {
  let wrapper: Awaited<ReturnType<typeof mountHome>>["wrapper"];

  beforeEach(async () => {
    ({ wrapper } = await mountHome("nl"));
  });

  afterEach(() => {
    wrapper.unmount();
    document.body.innerHTML = "";
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  describe("initial render", () => {
    it("renders without errors", () => {
      expect(wrapper.exists()).toBe(true);
    });

    it("renders the navbar (nav element)", () => {
      expect(wrapper.find("nav").exists()).toBe(true);
    });

    it("renders the logo image inside the navbar", () => {
      expect(wrapper.find("nav img").exists()).toBe(true);
    });

    it("renders the hero section with an h1", () => {
      expect(wrapper.find("h1").exists()).toBe(true);
    });

    it("renders the footer element", () => {
      expect(wrapper.find("footer").exists()).toBe(true);
    });

    it("renders the newsletter form", () => {
      expect(wrapper.find("form").exists()).toBe(true);
    });

    it("does not apply the dark class initially", () => {
      const root = wrapper.find("div");
      expect(root.classes()).not.toContain("dark");
    });
  });

  // ── Dark mode ──────────────────────────────────────────────────────────────

  describe("dark mode toggle", () => {
    it("adds the dark class when the dark mode button is clicked", async () => {
      // Find the button whose aria-label mentions dark mode (hardcoded, not translated)
      const darkBtn = wrapper
        .findAll("button[aria-label]")
        .find((b) => b.attributes("aria-label")?.toLowerCase().includes("dark"));
      await darkBtn!.trigger("click");
      expect(wrapper.find("div").classes()).toContain("dark");
    });

    it("removes the dark class when clicked again", async () => {
      const darkBtn = wrapper
        .findAll("button[aria-label]")
        .find((b) => b.attributes("aria-label")?.toLowerCase().includes("dark"));
      await darkBtn!.trigger("click");
      await darkBtn!.trigger("click");
      expect(wrapper.find("div").classes()).not.toContain("dark");
    });
  });

  // ── Content sections ───────────────────────────────────────────────────────

  describe("page sections", () => {
    it("renders multiple section elements", () => {
      const sections = wrapper.findAll("section");
      expect(sections.length).toBeGreaterThanOrEqual(4);
    });

    it("renders stat values on the page", () => {
      const text = wrapper.text();
      expect(text).toContain("12.482");
      expect(text).toContain("315");
    });

    it("renders the newsletter email input", () => {
      expect(wrapper.find("input[type='email']").exists()).toBe(true);
    });

    it("renders at least one h2 section heading", () => {
      const headings = wrapper.findAll("h2").map((h) => h.text());
      expect(headings.some((h) => h.length > 0)).toBe(true);
    });
  });
});
