import { describe, it, expect, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import HeroSection from "@/components/production/HeroSection.vue";
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared";


const i18n = createI18n({
  legacy: false,
  locale: "nl",
  messages: {
    nl: {
      production: {
        hero: {
          dateRange: "Datum",
          runningTime: "Speelduur",
          bannerImageAlt: "Banner",
        },
      },
      time: {
        minutes: "{m} min",
        hours: "{h} u",
        hoursMinutes: "{h} u {m}",
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


function mountHero(props: Partial<{
  production: ProductionWithBackwardsRefs;
  tagGroups: { label: string; tags: string[] }[];
  eventStats: any;
  bannerUrl: string | null;
}> = {}) {
  return mount(HeroSection, {
    props: {
      production: baseProduction,
      tagGroups: [],
      eventStats: null,
      bannerUrl: null,
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

describe("HeroSection.vue", () => {
  afterEach(() => {
    i18n.global.locale.value = "nl";
  });

  // ── rendering ─────────────────────────────────────────────

  describe("rendering", () => {
    it("uses bannerUrl for the hero image when set", () => {
      const wrapper = mountHero({ bannerUrl: "/media/crops/nbh.jpg" });
      const img = wrapper.get("img");
      expect(img.attributes("src")).toBe("/media/crops/nbh.jpg");
      expect(img.attributes("class") || "").not.toMatch(/grayscale/);
    });

    it("renders no hero image when bannerUrl is null (black background only)", () => {
      const wrapper = mountHero({ bannerUrl: null });
      expect(wrapper.find("img").exists()).toBe(false);
    });

    it("renders production content correctly", () => {
      const wrapper = mountHero();

      expect(wrapper.text()).toContain("Titel");
      expect(wrapper.text()).toContain("Artiest");
      expect(wrapper.text()).toContain("Tagline");
      expect(wrapper.text()).toContain("Supertitel");
    });

    it("renders translated labels", () => {
      const wrapper = mountHero();

      expect(wrapper.text()).toContain("Datum");
      expect(wrapper.text()).toContain("Speelduur");
    });
  });

  it("renders safely when optional language fields are missing", () => {
    const wrapper = mountHero({
      production: {
        ...baseProduction,
        title: null,
        artist: null,
        tagline: null,
        supertitle: null,
      } as any,
    });

    expect(wrapper.find("h1").exists()).toBe(true);
  });

  // ── date logic ─────────────────────────────────────────────

  describe("date display", () => {
    it("shows single date when hasMultipleDays is false", () => {
      const wrapper = mountHero({
        eventStats: {
          firstDate: new Date("2026-04-08"),
          lastDate: new Date("2026-04-08"),
          durationMinutes: 60,
          hasMultipleDays: false,
        },
      });

      const text = wrapper.text();

      expect(text).toContain("8.4.2026");
      expect(text).not.toContain("—");
    });

    it("shows date range when hasMultipleDays is true", () => {
      const wrapper = mountHero({
        eventStats: {
          firstDate: new Date("2026-04-08"),
          lastDate: new Date("2026-04-10"),
          durationMinutes: 60,
          hasMultipleDays: true,
        },
      });

      const text = wrapper.text();

      expect(text).toContain("8.4.2026");
      expect(text).toContain("10.4.2026");
      expect(text).toContain("—");
    });

    it("shows empty dates safely when eventStats is null", () => {
      const wrapper = mountHero({
        eventStats: null,
      });

      expect(wrapper.exists()).toBe(true);
    });
  });

  // ── duration ─────────────────────────────────────────────

  describe("duration display", () => {
    it("formats duration correctly (75 min → 1u15)", () => {
      const wrapper = mountHero({
        eventStats: {
          firstDate: new Date(),
          lastDate: new Date(),
          durationMinutes: 75,
          hasMultipleDays: false,
        },
      });

      expect(wrapper.text()).toContain("1 u 15");
    });

    it("shows dash when duration is null", () => {
      const wrapper = mountHero({
        eventStats: {
          firstDate: new Date(),
          lastDate: new Date(),
          durationMinutes: null,
          hasMultipleDays: false,
        },
      });

      expect(wrapper.text()).toContain("—");
    });
  });

  // ── genre tags ─────────────────────────────────────────────

  describe("genre tags", () => {
    it("renders genre tags when available", () => {
      const wrapper = mountHero({
        tagGroups: [
          { label: "Genre", tags: ["Dance", "Theatre"] },
        ],
      });

      expect(wrapper.text()).toContain("Dance");
      expect(wrapper.text()).toContain("Theatre");
    });

    it("ignores non-genre tag groups", () => {
      const wrapper = mountHero({
        tagGroups: [
          { label: "Location", tags: ["Gent"] },
        ],
      });

      expect(wrapper.text()).not.toContain("Gent");
    });

    it("renders nothing when no tagGroups exist", () => {
      const wrapper = mountHero({
        tagGroups: [],
      });

      expect(wrapper.exists()).toBe(true);
    });
  });
});
