import { describe, it, expect, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared";
import { routes } from "@/router/routes";
import { i18n } from "@/i18n";
import ProductionListCard from "@/components/productions/ProductionListCard.vue";
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
  hallsText?: string;
  thumbnailUrl?: string | null | undefined;
}) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push("/nl/productions");
  await router.isReady();

  const wrapper = mount(ProductionListCard, {
    props: {
      production: props.production ?? baseProduction,
      dateSummary: props.dateSummary ?? { line: "zo 01.01.2000", moreCount: 0 },
      tagChips: props.tagChips ?? [],
      hallsText: props.hallsText ?? "",
      ...(props.thumbnailUrl !== undefined ? { thumbnailUrl: props.thumbnailUrl } : {}),
    },
    global: { plugins: [router, i18n] },
  });
  return wrapper;
}

describe("ProductionListCard.vue", () => {
  afterEach(() => {
    i18n.global.locale.value = "nl";
  });

  it("renders title with right gutter clearing the date column", async () => {
    const wrapper = await mountCard({
      dateSummary: { line: "wo 01.01.2000", moreCount: 0 },
    });
    const h2 = wrapper.get("h2");
    expect(h2.text()).toContain("Titel");
    expect(h2.classes().some((c) => c.includes("pr-[12rem]"))).toBe(true);
    expect(h2.classes().some((c) => c.includes("sm:pr-[14rem]"))).toBe(true);
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

  it("shows hall row when hallsText is set", async () => {
    const wrapper = await mountCard({ hallsText: "Zaal A" });
    expect(wrapper.text()).toContain("Zaal A");
    expect(wrapper.find("svg").exists()).toBe(true);
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

  it("shows at most five tag pills and summarizes the rest with +n more", async () => {
    const tagChips: ProductionTagChip[] = Array.from({ length: 7 }, (_, i) => ({
      tagId: i + 1,
      label: `Tag ${i + 1}`,
      isGenre: false,
    }));
    const wrapper = await mountCard({ tagChips });
    expect(wrapper.findAll("span.rounded-sm")).toHaveLength(5);
    expect(wrapper.text()).toContain("+2 meer");
    wrapper.unmount();
  });

  it("shows every tag pill when there are five or fewer tags", async () => {
    const tagChips: ProductionTagChip[] = [1, 2, 3, 4, 5].map((id) => ({
      tagId: id,
      label: `T${id}`,
      isGenre: false,
    }));
    const wrapper = await mountCard({ tagChips });
    expect(wrapper.findAll("span.rounded-sm")).toHaveLength(5);
    expect(wrapper.text()).not.toContain("+");
    wrapper.unmount();
  });

  it("shows grey placeholder without img while thumbnailUrl is undefined", async () => {
    const wrapper = await mountCard({ thumbnailUrl: undefined });
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.find(".bg-surface-2").exists()).toBe(true);
    wrapper.unmount();
  });

  it("shows theme placeholder when thumbnailUrl is null (no list crop)", async () => {
    const wrapper = await mountCard({ thumbnailUrl: null });
    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toMatch(/placeholder-(light|dark)\.svg/);
    wrapper.unmount();
  });

  it("shows crop img src when thumbnailUrl is set", async () => {
    const wrapper = await mountCard({
      thumbnailUrl: "/media/crops/example.jpg",
    });
    const img = wrapper.find("img");
    expect(img.attributes("src")).toBe("/media/crops/example.jpg");
    wrapper.unmount();
  });

  it("renders no tag row when tagChips is empty", async () => {
    const wrapper = await mountCard({ tagChips: [] });
    expect(wrapper.findAll("span.rounded-sm")).toHaveLength(0);
    wrapper.unmount();
  });
});
