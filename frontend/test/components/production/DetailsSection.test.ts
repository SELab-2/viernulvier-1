import { describe, it, expect, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import ProductionDetailsSection from "@/components/production/DetailsSection.vue";
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared";


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
  video_1: null,
  video_2: null,
  quote: null,
  quote_source: null,
  programme: null,
  info: null,

  tags: [],
  events: [],
};


function mountComponent(props = {}) {
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

describe("ProductionDetailsSection.vue", () => {
  afterEach(() => {
    i18n.global.locale.value = "nl";
  });

  // ── sidebar visibility ─────────────────────────────────────────────

  describe("sidebar visibility", () => {
    it("hides sidebar when no content exists", () => {
      const wrapper = mountComponent({
        tagGroups: [],
        production: {
          ...baseProduction,
          teaser: null,
          description_extra: null,
        },
      });

      expect(wrapper.text()).not.toContain("Tags");
    });

    it("shows sidebar when tags exist", () => {
      const wrapper = mountComponent({
        tagGroups: [{ label: "Genre", tags: ["Dance"] }],
      });

      expect(wrapper.text()).toContain("Tags");
    });

    it("shows sidebar when teaser exists", () => {
      const wrapper = mountComponent({
        production: {
          ...baseProduction,
          teaser: { nl: "Teaser text" },
        },
      });

      expect(wrapper.text()).toContain("Teaser text");
    });
  });

  // ── tag accordion ─────────────────────────────────────────────

  describe("tag accordion", () => {
    it("renders tag button when tagGroups exist", () => {
      const wrapper = mountComponent({
        tagGroups: [{ label: "Genre", tags: ["Dance"] }],
      });

      expect(wrapper.find("button").exists()).toBe(true);
      expect(wrapper.text()).toContain("Tags");
    });

    it("renders tags when expanded (default true)", () => {
      const wrapper = mountComponent({
        tagGroups: [{ label: "Genre", tags: ["Dance", "Theatre"] }],
      });

      expect(wrapper.text()).toContain("Dance");
      expect(wrapper.text()).toContain("Theatre");
    });

    it("does not render empty tag groups", () => {
      const wrapper = mountComponent({
        tagGroups: [{ label: "Genre", tags: [] }],
      });

      expect(wrapper.text()).not.toContain("Genre");
    });
  });

  describe("DetailsSection - tag toggle", () => {
    it("toggles tagsExpanded when clicking header button", async () => {
      const wrapper = mountComponent({
        tagGroups: [{ label: "Genre", tags: ["Dance"] }],
      });

      expect(wrapper.text()).toContain("Dance");

      const button = wrapper.find("button");

      await button.trigger("click");

      expect(wrapper.text()).not.toContain("Dance");
    });
  });

  // ── quote block ─────────────────────────────────────────────

  describe("quote section", () => {
    it("renders quote", () => {
      const wrapper = mountComponent({
        production: {
          ...baseProduction,
          quote: { nl: "Een mooie quote" },
        },
      });

      expect(wrapper.text()).toContain("Een mooie quote");
    });

    it("renders quote source when present", () => {
      const wrapper = mountComponent({
        production: {
          ...baseProduction,
          quote: { nl: "Quote" },
          quote_source: { nl: "Auteur" },
        },
      });

      expect(wrapper.text()).toContain("Auteur");
    });

    it("does not render quote section when empty", () => {
      const wrapper = mountComponent();

      expect(wrapper.text()).not.toContain("“");
    });
  });

  // ── descriptions ─────────────────────────────────────────────

  describe("descriptions", () => {
    it("renders description", () => {
      const wrapper = mountComponent({
        production: {
          ...baseProduction,
          description: { nl: "Main description" },
        },
      });

      expect(wrapper.text()).toContain("Main description");
    });

    it("renders secondary description", () => {
      const wrapper = mountComponent({
        production: {
          ...baseProduction,
          description_2: { nl: "Second description" },
        },
      });

      expect(wrapper.text()).toContain("Second description");
    });
  });

  // ── teaser + extra description ─────────────────────────────────────────────
  describe("descriptions", () => {
    it("renders teaser + extra description + divider when both exist", () => {
      const wrapper = mountComponent({
        production: {
          ...baseProduction,
          teaser: { nl: "Teaser title" },
          description_extra: { nl: "Extra content" },
        },
      });

      expect(wrapper.text()).toContain("Teaser title");
      expect(wrapper.text()).toContain("Extra content");

      expect(wrapper.find(".h-px").exists()).toBe(true);
    });

    it("applies mb-4 class when teaser and description_extra are present", () => {
      const wrapper = mountComponent({
        production: {
          ...baseProduction,
          teaser: { nl: "Teaser text" },
          description_extra: { nl: "Extra content" },
        },
      });

      const h2 = wrapper.find("h2");

      expect(h2.exists()).toBe(true);
      expect(h2.classes()).toContain("mb-4");
    });

    it("does not apply mb-4 class when description_extra is empty", () => {
      const wrapper = mountComponent({
        production: {
          ...baseProduction,
          teaser: { nl: "Teaser text" },
          description_extra: null,
        },
      });

      const h2 = wrapper.find("h2");

      expect(h2.exists()).toBe(true);
      expect(h2.classes()).not.toContain("mb-4");
    });

    it("adds mb-4 class when teaser and extra description exist", () => {
      const wrapper = mountComponent({
        production: {
          ...baseProduction,
          teaser: { nl: "Teaser" },
          description_extra: { nl: "Extra" },
        },
      });

      const h2 = wrapper.find("h2");
      expect(h2.classes()).toContain("mb-4");
    });

    it("does not render extra block when description_extra is whitespace", () => {
      const wrapper = mountComponent({
        production: {
          ...baseProduction,
          teaser: { nl: "Teaser only" },
          description_extra: { nl: "   " },
        },
      });

      expect(wrapper.text()).toContain("Teaser only");

      expect(wrapper.find(".h-px").exists()).toBe(false);

      expect(wrapper.text()).not.toContain("Extra content");
    });

    it("does not render teaser when teaser is only whitespace", () => {
      const wrapper = mountComponent({
        production: {
          ...baseProduction,
          teaser: { nl: "   " },
        },
      });

      expect(wrapper.find("h2").exists()).toBe(false);

      expect(wrapper.text()).not.toContain("   ");
    });
  });

  // ── info + programme ─────────────────────────────────────────────

  describe("info and programme", () => {
    it("renders info section", () => {
      const wrapper = mountComponent({
        production: {
          ...baseProduction,
          info: { nl: "Extra info" },
        },
      });

      expect(wrapper.text()).toContain("Extra info");
    });

    it("renders programme section", () => {
      const wrapper = mountComponent({
        production: {
          ...baseProduction,
          programme: { nl: "Programme text" },
        },
      });

      expect(wrapper.text()).toContain("Programme text");
    });

    it("renders nothing when both are empty", () => {
      const wrapper = mountComponent();

      expect(wrapper.text()).not.toContain("Extra info");
      expect(wrapper.text()).not.toContain("Programme text");
    });
  });

  // ── layout logic ─────────────────────────────────────────────

  describe("layout classes", () => {
    it("applies full width layout when no sidebar", () => {
      const wrapper = mountComponent({
        tagGroups: [],
        production: {
          ...baseProduction,
          teaser: null,
          description_extra: null,
        },
      });

      const main = wrapper.find("div.space-y-16");
      expect(main.classes().some(c => c.includes("lg:col-span-12"))).toBe(true);
    });

    it("applies split layout when sidebar exists", () => {
      const wrapper = mountComponent({
        tagGroups: [{ label: "Genre", tags: ["Dance"] }],
      });

      expect(wrapper.text()).toContain("Tags");
    });
  });
});
