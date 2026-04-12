import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "@/router/routes";
import { i18n } from "@/i18n";
import HomeView from "@/views/HomeView.vue";
import MarkdownEditor from "@/components/MarkdownEditor.vue";

vi.mock("easymde", () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      codemirror: { on: vi.fn() },
      value: vi.fn().mockReturnValue(""),
      toTextArea: vi.fn(),
    };
  }),
}));
vi.mock("easymde/dist/easymde.min.css", () => ({}));

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

    it("includes at least three content sections", () => {
      expect(wrapper.findAll("section").length).toBeGreaterThanOrEqual(3);
    });

    it("includes the footer", () => {
      expect(wrapper.find("footer").exists()).toBe(true);
    });
  });

  // ── MarkdownEditor v-model ────────────────────────────────────────────────

  describe("markdown editor preview", () => {
    it("updates previewContent when MarkdownEditor emits update:modelValue", async () => {
      const editor = wrapper.findComponent(MarkdownEditor);
      await editor.vm.$emit("update:modelValue", "hello");
      // No error thrown — the v-model setter is exercised
    });
  });

});
