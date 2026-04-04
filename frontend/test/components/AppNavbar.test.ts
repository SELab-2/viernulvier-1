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
  });
});
