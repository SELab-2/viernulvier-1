import { describe, it, expect, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared";
import { routes } from "@/router/routes";
import { i18n } from "@/i18n";
import LinkedProductionsCarousel from "@/components/blogpost/LinkedProductionsCarousel.vue";

const makeProduction = (id: number, title = `Productie ${id}`): ProductionWithBackwardsRefs =>
  ({
    id,
    old_id: null,
    finalized: true,
    supertitle: null,
    title: { nl: title },
    artist: { nl: `Artiest ${id}` },
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
  }) as ProductionWithBackwardsRefs;

async function mountCarousel(props: {
  productions?: ProductionWithBackwardsRefs[];
  thumbnails?: Map<number, string | null>;
  dateRanges?: Map<number, string>;
}) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push("/nl/blog/post/1");
  await router.isReady();

  const wrapper = mount(LinkedProductionsCarousel, {
    props: {
      productions: props.productions ?? [],
      thumbnails: props.thumbnails ?? new Map(),
      dateRanges: props.dateRanges ?? new Map(),
    },
    global: { plugins: [router, i18n] },
  });
  return wrapper;
}

describe("LinkedProductionsCarousel.vue", () => {
  afterEach(() => {
    i18n.global.locale.value = "nl";
    vi.restoreAllMocks();
  });

  it("renders nothing when productions is empty", async () => {
    const wrapper = await mountCarousel({ productions: [] });
    expect(wrapper.find("section").exists()).toBe(false);
    wrapper.unmount();
  });

  it("renders the section when at least one production is provided", async () => {
    const wrapper = await mountCarousel({ productions: [makeProduction(1)] });
    expect(wrapper.find("section").exists()).toBe(true);
    wrapper.unmount();
  });

  it("renders a card for each production", async () => {
    const productions = [makeProduction(1), makeProduction(2), makeProduction(3)];
    const wrapper = await mountCarousel({ productions });
    const cards = wrapper.findAllComponents({ name: "LinkedProductionCard" });
    expect(cards).toHaveLength(3);
    wrapper.unmount();
  });

  it("shows the section heading from the i18n key blogpost.relatedProductions", async () => {
    const wrapper = await mountCarousel({ productions: [makeProduction(1)] });
    expect(wrapper.find("h2").text()).toBe(i18n.global.t("blogpost.relatedProductions"));
    wrapper.unmount();
  });

  it("passes the correct thumbnailUrl to each card", async () => {
    const thumbnails = new Map<number, string | null>([
      [1, "https://example.com/thumb1.jpg"],
      [2, null],
    ]);
    const wrapper = await mountCarousel({
      productions: [makeProduction(1), makeProduction(2)],
      thumbnails,
    });
    const cards = wrapper.findAllComponents({ name: "LinkedProductionCard" });
    expect(cards[0]!.props("thumbnailUrl")).toBe("https://example.com/thumb1.jpg");
    expect(cards[1]!.props("thumbnailUrl")).toBeNull();
    wrapper.unmount();
  });

  it("passes the correct dateRange to each card", async () => {
    const dateRanges = new Map<number, string>([
      [1, "01.01 - 31.01.2025"],
      [2, "01.03 - 15.03.2025"],
    ]);
    const wrapper = await mountCarousel({
      productions: [makeProduction(1), makeProduction(2)],
      dateRanges,
    });
    const cards = wrapper.findAllComponents({ name: "LinkedProductionCard" });
    expect(cards[0]!.props("dateRange")).toBe("01.01 - 31.01.2025");
    expect(cards[1]!.props("dateRange")).toBe("01.03 - 15.03.2025");
    wrapper.unmount();
  });

  it("passes undefined dateRange when the production id is not in the map", async () => {
    const wrapper = await mountCarousel({
      productions: [makeProduction(99)],
      dateRanges: new Map(),
    });
    const card = wrapper.findComponent({ name: "LinkedProductionCard" });
    expect(card.props("dateRange")).toBeUndefined();
    wrapper.unmount();
  });

  it("renders prev/next buttons with correct aria-labels", async () => {
    const wrapper = await mountCarousel({ productions: [makeProduction(1)] });
    const buttons = wrapper.findAll("button");
    const labels = buttons.map((b) => b.attributes("aria-label"));
    expect(labels).toContain("Previous");
    expect(labels).toContain("Next");
    wrapper.unmount();
  });

  it("calls scrollBy on the container when the next button is clicked", async () => {
    const wrapper = await mountCarousel({ productions: [makeProduction(1)] });
    const container = wrapper.find(".hide-scrollbar").element as HTMLElement;
    container.scrollBy = vi.fn();
    vi.spyOn(container, "clientWidth", "get").mockReturnValue(1024);
    const scrollBySpy = vi.spyOn(container, "scrollBy");

    const nextButton = wrapper.findAll("button").find((b) => b.attributes("aria-label") === "Next");
    await nextButton!.trigger("click");

    expect(scrollBySpy).toHaveBeenCalled();
    const call = scrollBySpy.mock.calls[0]![0] as ScrollToOptions;
    expect(call.left).toBeGreaterThan(0);
    expect(call.behavior).toBe("smooth");
    wrapper.unmount();
  });

  it("calls scrollBy with a negative left value when the prev button is clicked", async () => {
    const wrapper = await mountCarousel({ productions: [makeProduction(1)] });
    const container = wrapper.find(".hide-scrollbar").element as HTMLElement;
    container.scrollBy = vi.fn();
    vi.spyOn(container, "clientWidth", "get").mockReturnValue(1024);
    const scrollBySpy = vi.spyOn(container, "scrollBy");

    const prevButton = wrapper.findAll("button").find((b) => b.attributes("aria-label") === "Previous");
    await prevButton!.trigger("click");

    expect(scrollBySpy).toHaveBeenCalled();
    const call = scrollBySpy.mock.calls[0]![0] as ScrollToOptions;
    expect(call.left).toBeLessThan(0);
    expect(call.behavior).toBe("smooth");
    wrapper.unmount();
  });
});
