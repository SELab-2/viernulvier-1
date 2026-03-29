import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "@/router/routes";
import { i18n } from "@/i18n";
import HomeView from "@/views/HomeView.vue";

// ─── Helpers ────────────────────────────────────────────────────────────────
async function mountHome(lang: "nl" | "fr" | "en" = "nl") {
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  });

  // Navigeer naar de juiste taal zodat route.params.lang correct is
  await router.push(`/${lang}`);
  await router.isReady();

  const wrapper = mount(HomeView, {
    global: {
      plugins: [router, i18n],
    },
    attachTo: document.body,
  });

  return { wrapper, router };
}

/** Click the globe button to open/toggle the language dropdown. */
async function clickGlobe(wrapper: ReturnType<typeof mount>) {
  const buttons = wrapper.findAll("button.icon-btn");
  await buttons[0]!.trigger("click");
}

/** Click the moon button to toggle dark mode. */
async function clickMoon(wrapper: ReturnType<typeof mount>) {
  const buttons = wrapper.findAll("button.icon-btn");
  await buttons[1]!.trigger("click");
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("HomeView.vue", () => {
  let wrapper: Awaited<ReturnType<typeof mountHome>>["wrapper"];

  beforeEach(async () => {
    const result = await mountHome("nl");
    wrapper = result.wrapper;
  });

  afterEach(() => {
    wrapper.unmount();
    document.body.innerHTML = "";
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  describe("initial render", () => {
    it("renders the logo image", () => {
      const logo = wrapper.find("img.logo-img");
      expect(logo.exists()).toBe(true);
      expect(logo.attributes("alt")).toBe("vierNulvier");
    });

    it("renders the navbar with Home and Archief links", () => {
      const links = wrapper.findAll("a.nav-link");
      expect(links).toHaveLength(2);
      expect(links[0]!.text()).toBe("Home");
      expect(links[1]!.text()).toBe("Archief");
    });

    it("renders the hero title in Dutch by default", () => {
      expect(wrapper.find("h1.hero-title").text()).toBe(
        "Welkom bij het VierNulVier Archief",
      );
    });

    it("renders the CTA button in Dutch by default", () => {
      expect(wrapper.find("button.cta-btn").text()).toContain("Bekijk Archief");
    });

    it("renders the info card title in Dutch by default", () => {
      expect(wrapper.find("h2.info-title").text()).toBe("Over het archief");
    });

    it("renders three stat cards", () => {
      expect(wrapper.findAll(".stat-card")).toHaveLength(3);
    });

    it("renders correct stat numbers", () => {
      const numbers = wrapper.findAll(".stat-number").map((el) => el.text());
      expect(numbers).toEqual(["1000 +", "50 +", "15 +"]);
    });

    it("renders Dutch stat labels by default", () => {
      const labels = wrapper.findAll(".stat-label").map((el) => el.text());
      expect(labels).toEqual(["producties", "reeksen", "jaren"]);
    });

    it("does not have the dark class initially", () => {
      expect(wrapper.find(".app").classes()).not.toContain("dark");
    });

    it("does not show the language dropdown initially", () => {
      expect(wrapper.find(".lang-dropdown").exists()).toBe(false);
    });
  });

  // ── Dark mode ──────────────────────────────────────────────────────────────

  describe("dark mode toggle", () => {
    it("adds the dark class when moon button is clicked", async () => {
      await clickMoon(wrapper);
      expect(wrapper.find(".app").classes()).toContain("dark");
    });

    it("removes the dark class when moon button is clicked again", async () => {
      await clickMoon(wrapper);
      await clickMoon(wrapper);
      expect(wrapper.find(".app").classes()).not.toContain("dark");
    });

    it("toggles dark mode multiple times correctly", async () => {
      for (let i = 1; i <= 4; i++) {
        await clickMoon(wrapper);
        const hasDark = wrapper.find(".app").classes().includes("dark");
        expect(hasDark).toBe(i % 2 !== 0);
      }
    });
  });

  // ── Language dropdown ──────────────────────────────────────────────────────

  describe("language dropdown", () => {
    it("opens the dropdown when the globe button is clicked", async () => {
      await clickGlobe(wrapper);
      expect(wrapper.find(".lang-dropdown").exists()).toBe(true);
    });

    it("closes the dropdown when the globe button is clicked again", async () => {
      await clickGlobe(wrapper);
      await clickGlobe(wrapper);
      expect(wrapper.find(".lang-dropdown").exists()).toBe(false);
    });

    it("renders all three language options", async () => {
      await clickGlobe(wrapper);
      const options = wrapper.findAll(".lang-option");
      expect(options).toHaveLength(3);
      expect(options[0]!.text()).toContain("NL");
      expect(options[1]!.text()).toContain("FR");
      expect(options[2]!.text()).toContain("EN");
    });

    it("marks NL as active by default", async () => {
      await clickGlobe(wrapper);
      const options = wrapper.findAll(".lang-option");
      expect(options[0]!.classes()).toContain("active");
      expect(options[1]!.classes()).not.toContain("active");
      expect(options[2]!.classes()).not.toContain("active");
    });

    it("closes the dropdown after selecting a language", async () => {
      await clickGlobe(wrapper);
      await wrapper.findAll(".lang-option")[1]!.trigger("click");
      expect(wrapper.find(".lang-dropdown").exists()).toBe(false);
    });

    it("closes the dropdown when clicking outside", async () => {
      await clickGlobe(wrapper);
      expect(wrapper.find(".lang-dropdown").exists()).toBe(true);
      document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".lang-dropdown").exists()).toBe(false);
    });
  });

  // ── Language switching — French ────────────────────────────────────────────

  describe("switching to French (FR)", () => {
    beforeEach(async () => {
      await clickGlobe(wrapper);
      await wrapper.findAll(".lang-option")[1]!.trigger("click");
    });

    it("updates the nav links", () => {
      const links = wrapper.findAll("a.nav-link");
      expect(links[0]!.text()).toBe("Accueil");
      expect(links[1]!.text()).toBe("Archives");
    });

    it("updates the hero title", () => {
      expect(wrapper.find("h1.hero-title").text()).toBe(
        "Bienvenue dans les Archives VierNulVier",
      );
    });

    it("updates the CTA button", () => {
      expect(wrapper.find("button.cta-btn").text()).toContain(
        "Voir les Archives",
      );
    });

    it("updates the info card title", () => {
      expect(wrapper.find("h2.info-title").text()).toBe(
        "À propos des archives",
      );
    });

    it("updates the stat labels", () => {
      const labels = wrapper.findAll(".stat-label").map((el) => el.text());
      expect(labels).toEqual(["productions", "séries", "années"]);
    });

    it("marks FR as the active language", async () => {
      await clickGlobe(wrapper);
      const options = wrapper.findAll(".lang-option");
      expect(options[0]!.classes()).not.toContain("active");
      expect(options[1]!.classes()).toContain("active");
      expect(options[2]!.classes()).not.toContain("active");
    });
  });

  // ── Language switching — English ───────────────────────────────────────────

  describe("switching to English (EN)", () => {
    beforeEach(async () => {
      await clickGlobe(wrapper);
      await wrapper.findAll(".lang-option")[2]!.trigger("click");
    });

    it("updates the nav links", () => {
      const links = wrapper.findAll("a.nav-link");
      expect(links[0]!.text()).toBe("Home");
      expect(links[1]!.text()).toBe("Archive");
    });

    it("updates the hero title", () => {
      expect(wrapper.find("h1.hero-title").text()).toBe(
        "Welcome to the VierNulVier Archive",
      );
    });

    it("updates the CTA button", () => {
      expect(wrapper.find("button.cta-btn").text()).toContain("Browse Archive");
    });

    it("updates the info card title", () => {
      expect(wrapper.find("h2.info-title").text()).toBe("About the archive");
    });

    it("updates the stat labels", () => {
      const labels = wrapper.findAll(".stat-label").map((el) => el.text());
      expect(labels).toEqual(["productions", "series", "years"]);
    });

    it("marks EN as the active language", async () => {
      await clickGlobe(wrapper);
      const options = wrapper.findAll(".lang-option");
      expect(options[0]!.classes()).not.toContain("active");
      expect(options[1]!.classes()).not.toContain("active");
      expect(options[2]!.classes()).toContain("active");
    });
  });

  // ── Switching back to Dutch ────────────────────────────────────────────────

  describe("switching back to Dutch (NL)", () => {
    beforeEach(async () => {
      // Go EN → back to NL
      await clickGlobe(wrapper);
      await wrapper.findAll(".lang-option")[2]!.trigger("click");
      await clickGlobe(wrapper);
      await wrapper.findAll(".lang-option")[0]!.trigger("click");
    });

    it("restores Dutch hero title", () => {
      expect(wrapper.find("h1.hero-title").text()).toBe(
        "Welkom bij het VierNulVier Archief",
      );
    });

    it("restores Dutch stat labels", () => {
      const labels = wrapper.findAll(".stat-label").map((el) => el.text());
      expect(labels).toEqual(["producties", "reeksen", "jaren"]);
    });
  });

  // ── Stat numbers stay constant across languages ────────────────────────────

  describe("stat numbers are language-independent", () => {
    it.each(["NL", "FR", "EN"] as const)(
      "stat numbers are unchanged for %s",
      async (lang) => {
        const idx = ["NL", "FR", "EN"].indexOf(lang);
        await clickGlobe(wrapper);
        await wrapper.findAll(".lang-option")[idx]!.trigger("click");
        const numbers = wrapper.findAll(".stat-number").map((el) => el.text());
        expect(numbers).toEqual(["1000 +", "50 +", "15 +"]);
      },
    );
  });
});
