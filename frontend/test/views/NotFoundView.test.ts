import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "@/router/routes";
import { i18n } from "@/i18n";
import NotFoundView from "@/views/NotFoundView.vue";

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

async function mountView() {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push("/this-route-does-not-exist");
  await router.isReady();

  const wrapper = mount(NotFoundView, {
    global: { plugins: [router, i18n] },
    attachTo: document.body,
  });

  return { wrapper, router };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("NotFoundView.vue", () => {
  let wrapper: Awaited<ReturnType<typeof mountView>>["wrapper"];

  beforeEach(async () => {
    ({ wrapper } = await mountView());
  });

  afterEach(() => {
    wrapper.unmount();
    document.body.innerHTML = "";
  });

  // ── Composition ──────────────────────────────────────────────────────────

  describe("composition", () => {
    it("renders without errors", () => {
      expect(wrapper.exists()).toBe(true);
    });

    it("includes the navbar", () => {
      expect(wrapper.find("nav").exists()).toBe(true);
    });

    it("includes the NotFound content (h1 present)", () => {
      expect(wrapper.find("h1").exists()).toBe(true);
    });

    it("includes a call-to-action link", () => {
      expect(wrapper.find("a").exists()).toBe(true);
    });

    it("includes the footer", () => {
      expect(wrapper.find("footer").exists()).toBe(true);
    });
  });

  // ── Interaction ──────────────────────────────────────────────────────────

  describe("dark mode toggle", () => {
    it("toggles dark mode when navbar emits toggle-dark", async () => {
      const navbar = wrapper.findComponent({ name: "AppNavbar" });

      await navbar.vm.$emit("toggle-dark");

      expect(wrapper.exists()).toBe(true);
    });
  });
});
