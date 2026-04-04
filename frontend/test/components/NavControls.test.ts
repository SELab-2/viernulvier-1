import { describe, it, expect, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { i18n } from "@/i18n";
import { routes } from "@/router/routes";
import NavControls from "@/components/NavControls.vue";

async function mountNavControls(isDark = false) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push("/nl");
  await router.isReady();

  const wrapper = mount(NavControls, {
    props: { isDark },
    global: { plugins: [router, i18n] },
  });

  return wrapper;
}

describe("NavControls", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  // ── Dark mode button ───────────────────────────────────────────────────────

  describe("dark mode toggle", () => {
    it("renders the dark mode button", async () => {
      const wrapper = await mountNavControls();
      expect(wrapper.find("button[aria-label='Toggle dark mode']").exists()).toBe(true);
    });

    it("emits toggle-dark when the button is clicked", async () => {
      const wrapper = await mountNavControls();
      await wrapper.find("button[aria-label='Toggle dark mode']").trigger("click");
      expect(wrapper.emitted("toggle-dark")).toBeTruthy();
    });

    it("emits toggle-dark exactly once per click", async () => {
      const wrapper = await mountNavControls();
      await wrapper.find("button[aria-label='Toggle dark mode']").trigger("click");
      expect(wrapper.emitted("toggle-dark")).toHaveLength(1);
    });

    it("shows the moon icon when isDark is false", async () => {
      const wrapper = await mountNavControls(false);
      const svgs = wrapper.find("button[aria-label='Toggle dark mode']").findAll("svg");
      // moon icon is the v-else branch — only one svg rendered
      expect(svgs).toHaveLength(1);
      expect(wrapper.find("button[aria-label='Toggle dark mode']").find("path[d^='M21']").exists()).toBe(true);
    });

    it("shows the sun icon when isDark is true", async () => {
      const wrapper = await mountNavControls(true);
      const btn = wrapper.find("button[aria-label='Toggle dark mode']");
      expect(btn.find("circle[cx='12'][cy='12'][r='5']").exists()).toBe(true);
    });
  });

  // ── Language switcher ──────────────────────────────────────────────────────

  describe("language switcher", () => {
    it("renders the language button", async () => {
      const wrapper = await mountNavControls();
      const buttons = wrapper.findAll("button");
      expect(buttons.some(b => !b.attributes("aria-label"))).toBe(true);
    });

    it("language dropdown is hidden by default", async () => {
      const wrapper = await mountNavControls();
      expect(wrapper.find(".lang-dropdown").exists()).toBe(false);
    });

    it("opens the language dropdown on click", async () => {
      const wrapper = await mountNavControls();
      const langBtn = wrapper.findAll("button").find(b => !b.attributes("aria-label"))!;
      await langBtn.trigger("click");
      expect(wrapper.find(".lang-dropdown").exists()).toBe(true);
    });

    it("closes the language dropdown on second click", async () => {
      const wrapper = await mountNavControls();
      const langBtn = wrapper.findAll("button").find(b => !b.attributes("aria-label"))!;
      await langBtn.trigger("click");
      await langBtn.trigger("click");
      expect(wrapper.find(".lang-dropdown").exists()).toBe(false);
    });

    it("renders all supported languages in the dropdown", async () => {
      const wrapper = await mountNavControls();
      const langBtn = wrapper.findAll("button").find(b => !b.attributes("aria-label"))!;
      await langBtn.trigger("click");
      const options = wrapper.findAll(".lang-option");
      expect(options.map(o => o.text())).toEqual(["NL", "FR", "EN"]);
    });

    it("marks the current language as active", async () => {
      const wrapper = await mountNavControls();
      const langBtn = wrapper.findAll("button").find(b => !b.attributes("aria-label"))!;
      await langBtn.trigger("click");
      const active = wrapper.findAll(".lang-option.active");
      expect(active).toHaveLength(1);
      expect(active[0].text()).toBe("NL");
    });

    it("closes the dropdown and switches language on option click", async () => {
      const wrapper = await mountNavControls();
      const langBtn = wrapper.findAll("button").find(b => !b.attributes("aria-label"))!;
      await langBtn.trigger("click");
      await wrapper.findAll(".lang-option")[2].trigger("click"); // EN
      expect(wrapper.find(".lang-dropdown").exists()).toBe(false);
      expect(i18n.global.locale.value).toBe("en");
    });

    it("closes the dropdown on outside click", async () => {
      const wrapper = await mountNavControls();
      const langBtn = wrapper.findAll("button").find(b => !b.attributes("aria-label"))!;
      await langBtn.trigger("click");
      expect(wrapper.find(".lang-dropdown").exists()).toBe(true);
      document.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".lang-dropdown").exists()).toBe(false);
    });
  });
});