import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "@/router/routes";
import { i18n } from "@/i18n";
import AppNavbar from "@/components/AppNavbar.vue";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function mountNavbar(isDark = false) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push("/nl");
  await router.isReady();

  const wrapper = mount(AppNavbar, {
    props: { isDark },
    global: { plugins: [router, i18n] },
    attachTo: document.body,
  });

  return { wrapper, router };
}

async function openLangMenu(wrapper: ReturnType<typeof mount>) {
  // The language button is the first icon-btn (index 0)
  const btns = wrapper.findAll("button.icon-btn");
  await btns[0]!.trigger("click");
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("AppNavbar.vue", () => {
  let wrapper: Awaited<ReturnType<typeof mountNavbar>>["wrapper"];

  beforeEach(async () => {
    ({ wrapper } = await mountNavbar());
  });

  afterEach(() => {
    wrapper.unmount();
    document.body.innerHTML = "";
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  describe("initial render", () => {
    it("renders the logo image", () => {
      const logo = wrapper.find("img");
      expect(logo.exists()).toBe(true);
      expect(logo.attributes("alt")).toBe("VierNulVier");
    });

    it("renders the nav links", () => {
      const links = wrapper.findAll("a.nav-link");
      expect(links.length).toBeGreaterThanOrEqual(2);
    });

    it("renders the Home nav link", () => {
      const texts = wrapper.findAll("a.nav-link").map((l) => l.text());
      expect(texts).toContain("Home");
    });

    it("renders the Productions nav link", () => {
      // The label is translated — just verify at least 2 links exist
      const links = wrapper.findAll("a.nav-link");
      expect(links.length).toBeGreaterThanOrEqual(2);
    });

    it("does not show the language dropdown initially", () => {
      expect(wrapper.find(".lang-dropdown").exists()).toBe(false);
    });

    it("renders the language and dark mode icon buttons", () => {
      const btns = wrapper.findAll("button.icon-btn");
      expect(btns).toHaveLength(2);
    });
  });

  // ── Language dropdown ──────────────────────────────────────────────────────

  describe("language dropdown", () => {
    it("opens when the language button is clicked", async () => {
      await openLangMenu(wrapper);
      expect(wrapper.find(".lang-dropdown").exists()).toBe(true);
    });

    it("closes when the language button is clicked again", async () => {
      await openLangMenu(wrapper);
      await openLangMenu(wrapper);
      expect(wrapper.find(".lang-dropdown").exists()).toBe(false);
    });

    it("renders all three language options", async () => {
      await openLangMenu(wrapper);
      const options = wrapper.findAll(".lang-option");
      expect(options).toHaveLength(3);
    });

    it("renders NL, FR and EN language options", async () => {
      await openLangMenu(wrapper);
      const labels = wrapper.findAll(".lang-option").map((o) => o.text());
      expect(labels).toContain("NL");
      expect(labels).toContain("FR");
      expect(labels).toContain("EN");
    });

    it("marks the current language as active", async () => {
      await openLangMenu(wrapper);
      const active = wrapper
        .findAll(".lang-option")
        .filter((o) => o.classes().includes("active"));
      expect(active).toHaveLength(1);
    });

    it("closes the dropdown after selecting a language", async () => {
      await openLangMenu(wrapper);
      await wrapper.findAll(".lang-option")[1]!.trigger("click");
      expect(wrapper.find(".lang-dropdown").exists()).toBe(false);
    });

    it("closes when clicking outside the dropdown", async () => {
      await openLangMenu(wrapper);
      document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".lang-dropdown").exists()).toBe(false);
    });
  });

  // ── Dark mode ──────────────────────────────────────────────────────────────

  describe("dark mode toggle", () => {
    it("emits toggle-dark when the dark mode button is clicked", async () => {
      const buttons = wrapper.findAll("button.icon-btn");
      // The dark mode button is the second icon-btn (after language)
      const darkBtn = buttons.find((b) =>
        b.attributes("aria-label")?.toLowerCase().includes("dark"),
      );
      expect(darkBtn).toBeDefined();
      await darkBtn!.trigger("click");
      expect(wrapper.emitted("toggle-dark")).toBeTruthy();
    });

    it("shows sun icon (light_mode) when isDark is true", async () => {
      const { wrapper: darkWrapper } = await mountNavbar(true);
      // Sun icon has multiple <line> elements (rays), moon icon does not
      const darkBtn = darkWrapper
        .findAll("button.icon-btn")
        .find((b) => b.attributes("aria-label")?.toLowerCase().includes("dark"));
      expect(darkBtn!.find("svg line")).toBeTruthy();
      darkWrapper.unmount();
    });

    it("shows moon icon (dark_mode) when isDark is false", () => {
      const darkBtn = wrapper
        .findAll("button.icon-btn")
        .find((b) => b.attributes("aria-label")?.toLowerCase().includes("dark"));
      // Moon icon has a single <path>, no <line> elements
      expect(darkBtn!.find("svg path").exists()).toBe(true);
      expect(darkBtn!.findAll("svg line").length).toBe(0);
    });
  });
});
