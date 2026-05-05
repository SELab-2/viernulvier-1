import { describe, it, expect, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import { nextTick } from "vue";

import ProductionDetailsSection from "@/components/production/DetailsSection.vue";
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared";

// ─────────────────────────────────────────────────────────────
// i18n
// ─────────────────────────────────────────────────────────────

const i18n = createI18n({
  legacy: false,
  locale: "nl",
  messages: {
    nl: {
      production: {
        details: {
          tags: "Tags",
          extraInfo: "Extra info",
        },
      },
    },
  },
});

// ─────────────────────────────────────────────────────────────
// base data
// ─────────────────────────────────────────────────────────────

const baseProduction: ProductionWithBackwardsRefs = {
  id: 1,
  old_id: null,
  finalized: true,

  supertitle: { nl: "Supertitel" },
  title: { nl: "Titel" },
  artist: { nl: "Artiest" },
  tagline: { nl: "Tagline" },
  teaser: { nl: "" },

  description: null,
  description_extra: null,
  description_2: null,

  quote: null,
  quote_source: null,
  programme: null,
  info: null,

  video_1: null,
  video_2: null,

  tags: [],
  events: [],
};

// ─────────────────────────────────────────────────────────────
// helper
// ─────────────────────────────────────────────────────────────

function mountComponent(props: Partial<any> = {}) {
  return mount(ProductionDetailsSection, {
    props: {
      production: baseProduction,
      tagGroups: [],
      totalTags: 0,
      ...props,
    },
    global: {
      plugins: [i18n],
    },
  });
}

// ─────────────────────────────────────────────────────────────
// tests
// ─────────────────────────────────────────────────────────────

describe("ProductionDetailsSection", () => {
  afterEach(() => {
    i18n.global.locale.value = "nl";
  });

  // ─────────────────────────────────────────────
  // SIDEBAR
  // ─────────────────────────────────────────────

  describe("sidebar", () => {
    it("does not render sidebar when empty", () => {
      const wrapper = mountComponent();
      expect(wrapper.find(".lg\\:col-span-4").exists()).toBe(false);
    });

    it("renders sidebar when tags exist", () => {
      const wrapper = mountComponent({
        tagGroups: [{ label: "Genre", tags: ["Dance"] }],
      });

      expect(wrapper.text()).toContain("Tags");
    });

    it("renders sidebar when teaser exists", () => {
      const wrapper = mountComponent({
        production: {
          ...baseProduction,
          teaser: { nl: "Teaser text" },
        },
      });

      expect(wrapper.text()).toContain("Teaser text");
    });
  });

  // ─────────────────────────────────────────────
  // ACCORDION
  // ─────────────────────────────────────────────

  describe("tags accordion", () => {
    it("renders tags by default", () => {
      const wrapper = mountComponent({
        tagGroups: [{ label: "Genre", tags: ["Dance"] }],
      });

      expect(wrapper.text()).toContain("Dance");
    });

    it("toggles tags visibility", async () => {
      const wrapper = mountComponent({
        tagGroups: [{ label: "Genre", tags: ["Dance"] }],
      });

      const button = wrapper.find("button");

      expect(wrapper.text()).toContain("Dance");

      await button.trigger("click");
      await nextTick();

      expect(wrapper.text()).not.toContain("Dance");

      await button.trigger("click");
      await nextTick();

      expect(wrapper.text()).toContain("Dance");
    });

    it("does not render empty tag groups", () => {
      const wrapper = mountComponent({
        tagGroups: [{ label: "Genre", tags: [] }],
      });

      expect(wrapper.text()).not.toContain("Genre");
    });
  });

  // ─────────────────────────────────────────────
  // QUOTE
  // ─────────────────────────────────────────────

  describe("quote", () => {
    it("renders quote without extra characters", () => {
      const wrapper = mountComponent({
        production: {
          ...baseProduction,
          quote: { nl: '"A beautiful quote"' },
        },
      });

      expect(wrapper.text()).toContain("A beautiful quote");
      expect(wrapper.text()).not.toContain('"');
    });

    it("renders quote source", () => {
      const wrapper = mountComponent({
        production: {
          ...baseProduction,
          quote: { nl: "Quote" },
          quote_source: { nl: "Author" },
        },
      });

      expect(wrapper.text()).toContain("Author");
    });
  });

  // ─────────────────────────────────────────────
  // DESCRIPTION + v-html
  // ─────────────────────────────────────────────

  describe("descriptions (v-html + parsing)", () => {
    it("renders normal text", () => {
      const wrapper = mountComponent({
        production: {
          ...baseProduction,
          description: { nl: "Hello world" },
        },
      });

      expect(wrapper.text()).toContain("Hello world");
    });

    it("renders HTML safely via v-html", () => {
      const wrapper = mountComponent({
        production: {
          ...baseProduction,
          description: { nl: "<b>Bold text</b>" },
        },
      });

      expect(wrapper.html()).toContain("<b>Bold text</b>");
    });

    it("normalizes legacy backslashes", () => {
      const wrapper = mountComponent({
        production: {
          ...baseProduction,
          description: { nl: "\\nExtra content\\n" },
        },
      });

      expect(wrapper.text()).toContain("Extra content");
    });

    it("renders secondary description", () => {
      const wrapper = mountComponent({
        production: {
          ...baseProduction,
          description_2: { nl: "Second block" },
        },
      });

      expect(wrapper.text()).toContain("Second block");
    });
  });

  // ─────────────────────────────────────────────
  // TEASER + EXTRA
  // ─────────────────────────────────────────────

  describe("teaser + extra", () => {
    it("renders both blocks inside the marginalia aside", () => {
      const wrapper = mountComponent({
        production: {
          ...baseProduction,
          teaser: { nl: "Teaser" },
          description_extra: { nl: "Extra content" },
        },
      });

      expect(wrapper.text()).toContain("Teaser");
      expect(wrapper.text()).toContain("Extra content");
      // Marginalia uses a vertical rule on the left rather than an inline divider.
      expect(wrapper.find("aside .border-l-2").exists()).toBe(true);
    });

    it("does not render teaser when whitespace", () => {
      const wrapper = mountComponent({
        production: {
          ...baseProduction,
          teaser: { nl: "   " },
        },
      });

      expect(wrapper.find("h2").exists()).toBe(false);
    });
  });

  // ─────────────────────────────────────────────
  // INFO / PROGRAMME
  // ─────────────────────────────────────────────

  describe("info & programme", () => {
    it("renders info", () => {
      const wrapper = mountComponent({
        production: {
          ...baseProduction,
          info: { nl: "Info text" },
        },
      });

      expect(wrapper.text()).toContain("Info text");
    });

    it("renders programme", () => {
      const wrapper = mountComponent({
        production: {
          ...baseProduction,
          programme: { nl: "Programme text" },
        },
      });

      expect(wrapper.text()).toContain("Programme text");
    });
  });

  // ─────────────────────────────────────────────
  // LAYOUT
  // ─────────────────────────────────────────────

  describe("layout", () => {
    it("uses full width when no sidebar", () => {
      const wrapper = mountComponent();

      expect(wrapper.find(".lg\\:col-span-12").exists()).toBe(true);
    });

    it("uses split layout when sidebar exists", () => {
      const wrapper = mountComponent({
        tagGroups: [{ label: "Genre", tags: ["Dance"] }],
      });

      expect(wrapper.text()).toContain("Tags");
    });
  });
});
