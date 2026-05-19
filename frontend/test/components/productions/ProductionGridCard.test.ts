import { describe, it, expect, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared";
import { routes } from "@/router/routes";
import { i18n } from "@/i18n";
import ProductionGridCard from "@/components/productions/ProductionGridCard.vue";
import type { ProductionDateSummary } from "@/utils/productionsOverview";
import type { ProductionTagChip } from "@/utils/tagDisplay";

const baseProduction = {
  id: 1,
  old_id: null,
  finalized: true,
  supertitle: null,
  title: { nl: "Titel" },
  artist: { nl: "Artiest" },
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
  dateSummary?: ProductionDateSummary;
  tagChips?: ProductionTagChip[];
  thumbnailUrl?: string | null | undefined;
}) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push("/nl/productions");
  await router.isReady();

  const wrapper = mount(ProductionGridCard, {
    props: {
      production: props.production ?? baseProduction,
      dateSummary: props.dateSummary ?? { line: null, moreCount: 0 },
      tagChips: props.tagChips ?? [],
      thumbnailUrl: props.thumbnailUrl,
    },
    global: { plugins: [router, i18n] },
    attachTo: document.body,
  });
  // useFittingPills measures after onMounted; let those reactive updates flush.
  await flushPromises();
  return wrapper;
}

describe("ProductionGridCard.vue", () => {
  afterEach(() => {
    i18n.global.locale.value = "nl";
  });

  it("renders title in the card body", async () => {
    const wrapper = await mountCard({
      dateSummary: { line: "wo 01.01.2000", moreCount: 0 },
    });
    const h2 = wrapper.get("h2");
    expect(h2.text()).toContain("Titel");
    wrapper.unmount();
  });

  it("renders the date line when present", async () => {
    const wrapper = await mountCard({
      dateSummary: { line: "wo 01.01.2000", moreCount: 0 },
    });
    expect(wrapper.text()).toContain("wo 01.01.2000");
    wrapper.unmount();
  });

  it("shows “more performances” when moreCount > 0", async () => {
    const wrapper = await mountCard({
      dateSummary: { line: "wo 01.01.2000", moreCount: 2 },
    });
    expect(wrapper.text()).toMatch(/2/);
    wrapper.unmount();
  });

  it("hides artist block when artist is empty for locale", async () => {
    const wrapper = await mountCard({
      production: {
        ...baseProduction,
        artist: {},
      } as ProductionWithBackwardsRefs,
    });
    expect(wrapper.find("h2").exists()).toBe(true);
    expect(wrapper.findAll("p").filter((p) => p.text().includes("Artiest"))).toHaveLength(0);
    wrapper.unmount();
  });

  it("applies genre chip styling for isGenre and outline for other tags", async () => {
    const wrapper = await mountCard({
      tagChips: [
        { tagId: 1, label: "Theater", isGenre: true },
        { tagId: 2, label: "Vooruit", isGenre: false },
      ],
    });
    const chips = wrapper.findAll("span.rounded-sm");
    expect(chips[0]!.classes().join(" ")).toMatch(/tag-genre-bg/);
    expect(chips[1]!.classes().join(" ")).toMatch(/border-surface-3/);
    wrapper.unmount();
  });

  it("renders no tag row when tagChips is empty", async () => {
    const wrapper = await mountCard({ tagChips: [] });
    expect(wrapper.findAll("span.rounded-sm")).toHaveLength(0);
    wrapper.unmount();
  });

  it("renders only as many tag chips as the fitting-pills fallback allows", async () => {
    // JSDOM cannot measure widths, so useFittingPills falls back to its
    // fallbackVisibleCount (4). The component must not render a "+n" indicator.
    const wrapper = await mountCard({
      tagChips: [
        { tagId: 1, label: "T1", isGenre: false },
        { tagId: 2, label: "T2", isGenre: false },
        { tagId: 3, label: "T3", isGenre: false },
        { tagId: 4, label: "T4", isGenre: false },
        { tagId: 5, label: "T5", isGenre: false },
      ],
    });
    const chipCount = wrapper.findAll("span.rounded-sm").length;
    expect(chipCount).toBeGreaterThan(0);
    expect(chipCount).toBeLessThanOrEqual(5);
    expect(wrapper.text()).not.toMatch(/\+\d/);
    wrapper.unmount();
  });

  it("renders the crop thumbnail when a URL is provided", async () => {
    const wrapper = await mountCard({ thumbnailUrl: "/media/crops/abc.webp" });
    const img = wrapper.get("img");
    expect(img.attributes("src")).toBe("/media/crops/abc.webp");
    expect(img.classes()).toContain("object-cover");
    wrapper.unmount();
  });

  it("falls back to the placeholder when thumbnailUrl is null", async () => {
    const wrapper = await mountCard({ thumbnailUrl: null });
    const img = wrapper.get("img");
    expect(img.attributes("src")).toMatch(/placeholder/);
    expect(img.classes()).toContain("object-contain");
    wrapper.unmount();
  });

  it("omits the thumbnail image while loading (thumbnailUrl undefined)", async () => {
    const wrapper = await mountCard({ thumbnailUrl: undefined });
    expect(wrapper.find("img").exists()).toBe(false);
    wrapper.unmount();
  });
});
