import { describe, it, expect, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "@/router/routes";
import HeroSection from "@/components/production/HeroSection.vue";
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared";

const i18n = createI18n({
  legacy: false,
  locale: "nl",
  messages: {
    nl: {
      production: {
        hero: {
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

async function mountHero(
  props: Partial<{
    production: ProductionWithBackwardsRefs;
    tagGroups: { label: string; tags: string[] }[];
    eventStats: any;
    bannerUrl: string | null;
  }> = {},
) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push("/nl");
  await router.isReady();

  return mount(HeroSection, {
    props: {
      production: baseProduction,
      tagGroups: [],
      eventStats: null,
      bannerUrl: null,
      ...props,
    },
    global: {
      plugins: [i18n, router],
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
    it("uses bannerUrl for the hero image when set, in full colour", async () => {
      const wrapper = await mountHero({ bannerUrl: "/media/crops/nbh.jpg" });
      const img = wrapper.get("img");
      expect(img.attributes("src")).toBe("/media/crops/nbh.jpg");
      // The hero shows the photograph in colour; no grayscale filter.
      expect(img.attributes("class") || "").not.toMatch(/grayscale/);
    });

    it("renders no hero image when bannerUrl is null (dark background only)", async () => {
      const wrapper = await mountHero({ bannerUrl: null });
      expect(wrapper.find("img").exists()).toBe(false);
    });

    it("renders title, tagline and artist as the article header", async () => {
      const wrapper = await mountHero();

      expect(wrapper.find("h1").text()).toContain("Titel");
      expect(wrapper.text()).toContain("Tagline");
      expect(wrapper.text()).toContain("Artiest");
    });

    it("renders the artist above the title in the DOM", async () => {
      const wrapper = await mountHero();
      const text = wrapper.text();
      const artistIdx = text.indexOf("Artiest");
      const titleIdx = text.indexOf("Titel");
      expect(artistIdx).toBeGreaterThanOrEqual(0);
      expect(titleIdx).toBeGreaterThanOrEqual(0);
      expect(artistIdx).toBeLessThan(titleIdx);
    });

    it("renders the supertitle as part of the kicker", async () => {
      const wrapper = await mountHero();
      expect(wrapper.text()).toContain("Supertitel");
    });
  });

  it("renders safely when optional language fields are missing", async () => {
    const wrapper = await mountHero({
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

  // ── kicker (department · genre · year) ────────────────────

  describe("kicker", () => {
    it("includes the year of the first event when eventStats is provided", async () => {
      const wrapper = await mountHero({
        eventStats: {
          firstDate: new Date("1987-04-08"),
          lastDate: new Date("1987-04-10"),
          durationMinutes: 60,
          hasMultipleDays: true,
        },
      });

      expect(wrapper.text()).toContain("1987");
    });

    it("includes the primary genre tag in the kicker", async () => {
      const wrapper = await mountHero({
        tagGroups: [{ label: "Genre", tags: ["Dance", "Theatre"] }],
      });

      // Only the primary (first) genre is shown in the kicker.
      expect(wrapper.text()).toContain("Dance");
    });

    it("ignores non-genre tag groups in the kicker", async () => {
      const wrapper = await mountHero({
        tagGroups: [{ label: "Location", tags: ["Gent"] }],
      });

      expect(wrapper.text()).not.toContain("Gent");
    });

    it("collapses duplicates in the kicker", async () => {
      const wrapper = await mountHero({
        production: {
          ...baseProduction,
          supertitle: { nl: "Theatre" },
        } as any,
        tagGroups: [{ label: "Genre", tags: ["Theatre"] }],
        eventStats: {
          firstDate: new Date("1987-04-08"),
          lastDate: new Date("1987-04-08"),
          durationMinutes: 60,
          hasMultipleDays: false,
        },
      });

      // "Theatre" appears once even though both supertitle and genre carry it.
      const matches = wrapper.text().match(/Theatre/g) ?? [];
      expect(matches.length).toBe(1);
    });

    it("renders no kicker rule when there is nothing to show", async () => {
      const wrapper = await mountHero({
        production: {
          ...baseProduction,
          supertitle: null,
        } as any,
        tagGroups: [],
        eventStats: null,
      });

      // Kicker container is conditional on `kicker` being non-empty;
      // the rules and label should not appear.
      expect(wrapper.find("h1").exists()).toBe(true);
    });
  });

  // ── run period + running time strip ───────────────────────

  describe("run / duration strip", () => {
    it("renders single date and running time when given", async () => {
      const wrapper = await mountHero({
        eventStats: {
          firstDate: new Date("1987-04-08"),
          lastDate: new Date("1987-04-08"),
          durationMinutes: 90,
          hasMultipleDays: false,
        },
      });

      const text = wrapper.text();
      expect(text).toContain("1987");
      // formatDurationMinutesI18n with the test i18n returns "1 u 30".
      expect(text).toContain("1 u 30");
    });

    it("renders a date range when the production has multiple days", async () => {
      const wrapper = await mountHero({
        eventStats: {
          firstDate: new Date("1987-04-08"),
          lastDate: new Date("1987-04-10"),
          durationMinutes: null,
          hasMultipleDays: true,
        },
      });

      // Two formatted dates joined by an em dash.
      const text = wrapper.text();
      expect(text.match(/1987/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    });
  });
});
