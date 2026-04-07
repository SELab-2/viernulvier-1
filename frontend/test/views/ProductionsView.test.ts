import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import type {
  Event,
  Hall,
  ProductionWithBackwardsRefs,
  Tag,
} from "@viernulvier/shared";
import { routes } from "@/router/routes";
import { i18n } from "@/i18n";
import ProductionsView from "@/views/ProductionsView.vue";
import * as productionsService from "@/services/productions";
import * as tagsService from "@/services/tags";
import type { TagType } from "@viernulvier/shared";
import * as eventsService from "@/services/events";
import * as hallsService from "@/services/halls";

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

const mockProduction = {
  id: 42,
  old_id: null,
  finalized: true,
  supertitle: { nl: "Reeks naam" },
  title: { nl: "De voorstelling" },
  artist: { nl: "Een gezelschap" },
  tagline: { nl: "Korte tagline" },
  teaser: { nl: "Een iets langere teaser voor op de kaart in het overzicht." },
  description: null,
  description_extra: null,
  description_2: null,
  video_1: null,
  video_2: null,
  quote: null,
  quote_source: null,
  programme: null,
  info: null,
  tags: [7] as unknown as ProductionWithBackwardsRefs["tags"],
  events: [9001] as unknown as ProductionWithBackwardsRefs["events"],
} as ProductionWithBackwardsRefs;

const mockTag = {
  id: 7,
  old_id: null,
  name: { nl: "Theater" },
  tag_type: 1 as unknown as Tag["tag_type"],
  public: true,
} as Tag;

const mockEvent = {
  id: 9001,
  old_id: null,
  starts_at: new Date("2006-09-06T20:00:00.000Z"),
  ends_at: new Date("2006-09-06T22:00:00.000Z"),
  doors_at: new Date("2006-09-06T19:30:00.000Z"),
  info: { nl: "" },
  production: 42 as unknown as Event["production"],
  hall: 3 as unknown as Event["hall"],
  price: [],
} as Event;

const mockHall = {
  id: 3,
  old_id: null,
  address: "Straat 1",
  name: { nl: "NTGent" },
} as Hall;

const mockTagTypeGenre = {
  id: 1,
  name: { nl: "Genre", en: "Genre", fr: "Genre" },
} as TagType;

describe("ProductionsView.vue", () => {
  beforeEach(() => {
    vi.spyOn(productionsService, "getProductions").mockResolvedValue([
      mockProduction,
    ]);
    vi.spyOn(tagsService, "getTags").mockResolvedValue([mockTag]);
    vi.spyOn(tagsService, "getTagTypes").mockResolvedValue([mockTagTypeGenre]);
    vi.spyOn(eventsService, "getEvents").mockResolvedValue([mockEvent]);
    vi.spyOn(hallsService, "getHalls").mockResolvedValue([mockHall]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.classList.remove("dark");
    localStorage.clear();
  });

  async function mountView() {
    const router = createRouter({ history: createMemoryHistory(), routes });
    await router.push("/nl/productions");
    await router.isReady();

    const wrapper = mount(ProductionsView, {
      global: { plugins: [router, i18n] },
      attachTo: document.body,
    });
    await flushPromises();
    return { wrapper, router };
  }

  it("renders the page heading after data loads", async () => {
    const { wrapper } = await mountView();
    expect(wrapper.text()).toContain("Producties");
    expect(productionsService.getProductions).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it("renders production title from the list", async () => {
    const { wrapper } = await mountView();
    expect(wrapper.text()).toContain("De voorstelling");
    expect(wrapper.text()).toContain("Een gezelschap");
    wrapper.unmount();
  });

  it("shows an error message when loading fails", async () => {
    vi.spyOn(productionsService, "getProductions").mockRejectedValue(
      new Error("network"),
    );
    const { wrapper } = await mountView();
    expect(wrapper.text()).toContain("niet worden geladen");
    wrapper.unmount();
  });

  it("shows loading then empty state when the API returns no productions", async () => {
    let finishFetch!: (value: ProductionWithBackwardsRefs[]) => void;
    const deferred = new Promise<ProductionWithBackwardsRefs[]>((resolve) => {
      finishFetch = resolve;
    });
    vi.spyOn(productionsService, "getProductions").mockReturnValue(deferred);

    const router = createRouter({ history: createMemoryHistory(), routes });
    await router.push("/nl/productions");
    await router.isReady();

    const wrapper = mount(ProductionsView, {
      global: { plugins: [router, i18n] },
      attachTo: document.body,
    });

    await nextTick();
    expect(wrapper.text()).toContain("laden");

    finishFetch([]);
    await flushPromises();

    expect(wrapper.text()).toContain("nog geen producties");
    wrapper.unmount();
    document.body.innerHTML = "";
  });

  it("uses saved dark-mode preference from localStorage", async () => {
    localStorage.setItem("viernulvier-dark", "true");
    const { wrapper } = await mountView();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    wrapper.unmount();
  });

  it("skips unknown tags and tags with empty localized names", async () => {
    vi.spyOn(productionsService, "getProductions").mockResolvedValue([
      {
        ...mockProduction,
        tags: [7, 99, 8] as unknown as ProductionWithBackwardsRefs["tags"],
      } as ProductionWithBackwardsRefs,
    ]);
    vi.spyOn(tagsService, "getTags").mockResolvedValue([
      mockTag,
      {
        id: 8,
        old_id: null,
        name: {},
        tag_type: 1 as unknown as Tag["tag_type"],
        public: true,
      } as Tag,
    ]);

    const { wrapper } = await mountView();
    expect(wrapper.text()).toContain("Theater");
    expect(wrapper.text()).not.toContain("99");
    wrapper.unmount();
  });
});
