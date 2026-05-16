import { describe, it, expect, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared";
import { routes } from "@/router/routes";
import { i18n } from "@/i18n";
import LinkedProductionCard from "@/components/blogpost/LinkedProductionCard.vue";

const baseProduction = {
  id: 42,
  old_id: null,
  finalized: true,
  supertitle: null,
  title: { nl: "Mijn Productie" },
  artist: { nl: "Mijn Artiest" },
  tagline: { nl: "" },
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
  tags: [] as unknown as ProductionWithBackwardsRefs["tags"],
  events: [] as unknown as ProductionWithBackwardsRefs["events"],
} as ProductionWithBackwardsRefs;

async function mountCard(props: {
  production?: ProductionWithBackwardsRefs;
  thumbnailUrl?: string | null;
  dateRange?: string;
}) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push("/nl/blog/post/1");
  await router.isReady();

  const wrapper = mount(LinkedProductionCard, {
    props: {
      production: props.production ?? baseProduction,
      thumbnailUrl: props.thumbnailUrl,
      dateRange: props.dateRange,
    },
    global: { plugins: [router, i18n] },
  });
  return wrapper;
}

describe("LinkedProductionCard.vue", () => {
  afterEach(() => {
    i18n.global.locale.value = "nl";
  });

  it("renders a RouterLink pointing to the production detail page", async () => {
    const wrapper = await mountCard({});
    const link = wrapper.find("a");
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toContain("42");
    wrapper.unmount();
  });

  it("renders the production title in an h3", async () => {
    const wrapper = await mountCard({});
    const h3 = wrapper.get("h3");
    expect(h3.text()).toContain("Mijn Productie");
    wrapper.unmount();
  });

  it("renders the artist name", async () => {
    const wrapper = await mountCard({});
    expect(wrapper.text()).toContain("Mijn Artiest");
    wrapper.unmount();
  });

  it("hides the artist span when artist is empty for the current locale", async () => {
    const wrapper = await mountCard({
      production: { ...baseProduction, artist: {} } as ProductionWithBackwardsRefs,
    });
    const spans = wrapper.findAll("span");
    expect(spans.some((s) => s.text().includes("Artiest"))).toBe(false);
    wrapper.unmount();
  });

  it("shows the thumbnail image when thumbnailUrl is provided", async () => {
    const wrapper = await mountCard({ thumbnailUrl: "https://example.com/image.jpg" });
    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("https://example.com/image.jpg");
    wrapper.unmount();
  });

  it("sets the img alt text to the production title", async () => {
    const wrapper = await mountCard({ thumbnailUrl: "https://example.com/image.jpg" });
    expect(wrapper.find("img").attributes("alt")).toBe("Mijn Productie");
    wrapper.unmount();
  });

  it("renders a placeholder div instead of an img when thumbnailUrl is absent", async () => {
    const wrapper = await mountCard({ thumbnailUrl: null });
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.find("div.bg-surface-2").exists()).toBe(true);
    wrapper.unmount();
  });

  it("shows the date range when provided", async () => {
    const wrapper = await mountCard({ dateRange: "01.01 – 31.01.2025" });
    expect(wrapper.text()).toContain("01.01 – 31.01.2025");
    wrapper.unmount();
  });

  it("hides the date range span when dateRange is not provided", async () => {
    const wrapper = await mountCard({});
    const spans = wrapper.findAll("span");
    expect(spans.some((s) => s.text().includes("–"))).toBe(false);
    wrapper.unmount();
  });

  it("renders the description when present", async () => {
    const wrapper = await mountCard({
      production: {
        ...baseProduction,
        description: { nl: "<p>Een geweldige voorstelling.</p>" },
      } as ProductionWithBackwardsRefs,
    });
    expect(wrapper.text()).toContain("Een geweldige voorstelling.");
    wrapper.unmount();
  });

  it("omits the description block when description is null", async () => {
    const wrapper = await mountCard({
      production: { ...baseProduction, description: null } as ProductionWithBackwardsRefs,
    });
    expect(wrapper.find(".prose-flat").exists()).toBe(false);
    wrapper.unmount();
  });

  it("uses the active locale to display title and artist", async () => {
    i18n.global.locale.value = "fr";
    const wrapper = await mountCard({
      production: {
        ...baseProduction,
        title: { nl: "Nederlandse Titel", fr: "Titre Français" },
        artist: { nl: "Nederlandse Artiest", fr: "Artiste Français" },
      } as ProductionWithBackwardsRefs,
    });
    expect(wrapper.text()).toContain("Titre Français");
    expect(wrapper.text()).toContain("Artiste Français");
    expect(wrapper.text()).not.toContain("Nederlandse Titel");
    wrapper.unmount();
  });
});
