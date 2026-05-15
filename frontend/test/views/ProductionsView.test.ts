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
import {
  PRODUCTION_LIST_ERROR_CODE,
  PRODUCTION_LIST_YEAR_RANGE_ORDER_MESSAGE,
} from "@viernulvier/shared";
import { ApiError } from "@/services/api";
import { routes } from "@/router/routes";
import { i18n } from "@/i18n";
import { __reset as resetDarkMode } from "@/composables/useDarkMode";
import * as mediaService from "@/services/media";
import * as productionsService from "@/services/productions";
import type { ProductionListPage } from "@/services/productions";
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

/** Passed on every paginated `getProductions` call (route `/nl/...` → `lang: "nl"`). */
const DEFAULT_LIST_FETCH_OPTS = {
  sortBy: "date" as const,
  sortDir: "desc" as const,
  lang: "nl" as const,
};

/** Mount through `<router-view />` so `onBeforeRouteUpdate` registers (matches the real app). */
const routerViewRoot = { template: "<router-view />" };

describe("ProductionsView.vue", () => {
  beforeEach(() => {
    vi.spyOn(productionsService, "getProductions").mockResolvedValue({
      items: [mockProduction],
      total: 1,
    });
    vi.spyOn(mediaService, "getImagesForProductionsOrEmpty").mockResolvedValue(
      new Map([[mockProduction.id, []]]),
    );
    vi.spyOn(tagsService, "getTags").mockResolvedValue([mockTag]);
    vi.spyOn(tagsService, "getTagTypes").mockResolvedValue([mockTagTypeGenre]);
    vi.spyOn(eventsService, "getEventsForProductions").mockResolvedValue([
      mockEvent,
    ]);
    vi.spyOn(hallsService, "getHalls").mockResolvedValue([mockHall]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    resetDarkMode();
    document.documentElement.classList.remove("dark");
  });

  async function mountView(initialPath = "/nl/productions") {
    const router = createRouter({ history: createMemoryHistory(), routes });
    await router.push(initialPath);
    await router.isReady();

    const wrapper = mount(routerViewRoot, {
      global: { plugins: [router, i18n] },
      attachTo: document.body,
    });
    await flushPromises();
    return { wrapper, router };
  }

  it("renders the page heading after data loads", async () => {
    const { wrapper } = await mountView();
    expect(wrapper.text()).toContain("Producties");
    expect(productionsService.getProductions).toHaveBeenCalledWith({
      limit: 20,
      offset: 0,
      ...DEFAULT_LIST_FETCH_OPTS,
    });
    wrapper.unmount();
  });

  it("renders one archive detail link per production when a full page is returned", async () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      ...mockProduction,
      id: i + 1,
      title: { nl: `Titel ${i + 1}` },
      tags: [] as unknown as ProductionWithBackwardsRefs["tags"],
      events: [] as unknown as ProductionWithBackwardsRefs["events"],
    })) as ProductionWithBackwardsRefs[];
    vi.spyOn(productionsService, "getProductions").mockResolvedValue({
      items,
      total: 500,
    });
    vi.spyOn(eventsService, "getEventsForProductions").mockResolvedValue([]);

    const { wrapper } = await mountView();
    const detailLinks = wrapper.findAll("a").filter((w) =>
      /\/(nl|en|fr)\/productions\/\d+$/.test(w.attributes("href") ?? ""),
    );
    expect(detailLinks.length).toBe(20);
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
    let finishFetch!: (value: ProductionListPage) => void;
    const deferred = new Promise<ProductionListPage>((resolve) => {
      finishFetch = resolve;
    });
    vi.spyOn(productionsService, "getProductions").mockReturnValue(deferred);

    const router = createRouter({ history: createMemoryHistory(), routes });
    await router.push("/nl/productions");
    await router.isReady();

    const wrapper = mount(routerViewRoot, {
      global: { plugins: [router, i18n] },
      attachTo: document.body,
    });

    await nextTick();
    expect(wrapper.text()).toContain("laden");

    finishFetch({ items: [], total: 0 });
    await flushPromises();

    expect(wrapper.text()).toContain("nog geen producties");
    wrapper.unmount();
    document.body.innerHTML = "";
  });

  it("uses saved dark-mode preference from localStorage", async () => {
    localStorage.setItem("viernulvier-dark", "true");
    resetDarkMode();
    const { wrapper } = await mountView();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    wrapper.unmount();
  });

  it("applies search and refetches with the search query", async () => {
    const getProductionsSpy = vi.spyOn(productionsService, "getProductions");
    getProductionsSpy.mockResolvedValue({
      items: [mockProduction],
      total: 1,
    });

    const { wrapper, router } = await mountView();
    expect(getProductionsSpy).toHaveBeenCalledTimes(1);

    const searchInput = wrapper.find("#productions-search");
    expect(searchInput.exists()).toBe(true);
    await searchInput.setValue("voorstelling");
    await searchInput.trigger("keydown.enter");
    await flushPromises();

    expect(getProductionsSpy).toHaveBeenLastCalledWith({
      limit: 20,
      offset: 0,
      search: ["voorstelling"],
      ...DEFAULT_LIST_FETCH_OPTS,
    });
    expect(router.currentRoute.value.query.search).toBe("voorstelling");
    wrapper.unmount();
  });

  it("uses the search query from the URL on initial load", async () => {
    const getProductionsSpy = vi.spyOn(productionsService, "getProductions");
    getProductionsSpy.mockResolvedValue({
      items: [mockProduction],
      total: 1,
    });

    const { wrapper } = await mountView("/nl/productions?search=gezelschap");
    expect(getProductionsSpy).toHaveBeenCalledWith({
      limit: 20,
      offset: 0,
      search: ["gezelschap"],
      ...DEFAULT_LIST_FETCH_OPTS,
    });
    wrapper.unmount();
  });

  it("fetches the requested page when the page field is committed", async () => {
    const getProductionsSpy = vi.spyOn(productionsService, "getProductions");
    getProductionsSpy.mockResolvedValue({
      items: [mockProduction],
      total: 45,
    });

    const { wrapper } = await mountView();
    const field = wrapper.find('input[inputmode="numeric"]');
    expect(field.exists()).toBe(true);

    await field.setValue("3");
    await field.trigger("blur");
    await flushPromises();

    expect(getProductionsSpy).toHaveBeenLastCalledWith({
      limit: 20,
      offset: 40,
      ...DEFAULT_LIST_FETCH_OPTS,
    });

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    wrapper.unmount();
  });

  it("does not refetch when committing the current page number", async () => {
    const getProductionsSpy = vi.spyOn(productionsService, "getProductions");
    getProductionsSpy.mockResolvedValue({
      items: [mockProduction],
      total: 45,
    });

    const { wrapper } = await mountView();
    expect(getProductionsSpy).toHaveBeenCalledTimes(1);

    const field = wrapper.find('input[inputmode="numeric"]');
    await field.setValue("1");
    await field.trigger("blur");
    await flushPromises();

    expect(getProductionsSpy).toHaveBeenCalledTimes(1);

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    wrapper.unmount();
  });

  it("jumps to page 2 when Enter is pressed in the page field", async () => {
    const getProductionsSpy = vi.spyOn(productionsService, "getProductions");
    getProductionsSpy.mockResolvedValue({
      items: [mockProduction],
      total: 45,
    });

    const { wrapper } = await mountView();
    const field = wrapper.find('input[inputmode="numeric"]');
    await field.setValue("2");
    await field.trigger("keydown.enter");
    await flushPromises();

    expect(getProductionsSpy).toHaveBeenLastCalledWith({
      limit: 20,
      offset: 20,
      ...DEFAULT_LIST_FETCH_OPTS,
    });

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    wrapper.unmount();
  });

  it("clamps the page field to the last page when the value is too large", async () => {
    const getProductionsSpy = vi.spyOn(productionsService, "getProductions");
    getProductionsSpy.mockResolvedValue({
      items: [mockProduction],
      total: 45,
    });

    const { wrapper } = await mountView();
    const field = wrapper.find('input[inputmode="numeric"]');
    await field.setValue("999");
    await field.trigger("blur");
    await flushPromises();

    expect(getProductionsSpy).toHaveBeenLastCalledWith({
      limit: 20,
      offset: 40,
      ...DEFAULT_LIST_FETCH_OPTS,
    });
    expect((field.element as HTMLInputElement).value).toBe("3");

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    wrapper.unmount();
  });

  it("shows an error when pagination request fails", async () => {
    const getProductionsSpy = vi.spyOn(productionsService, "getProductions");
    getProductionsSpy
      .mockResolvedValueOnce({
        items: [mockProduction],
        total: 45,
      })
      .mockRejectedValueOnce(new Error("network"));

    const { wrapper } = await mountView();
    expect(wrapper.text()).not.toContain("niet worden geladen");

    const nextBtn = wrapper
      .findAll("button")
      .find((b) => b.text() === "Volgende");
    expect(nextBtn).toBeDefined();
    await nextBtn!.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("niet worden geladen");
    wrapper.unmount();
  });

  it("resets the page field when the committed value is not finite", async () => {
    const getProductionsSpy = vi.spyOn(productionsService, "getProductions");
    getProductionsSpy.mockResolvedValue({
      items: [mockProduction],
      total: 45,
    });

    const { wrapper } = await mountView();
    const field = wrapper.find('input[inputmode="numeric"]');

    await field.setValue("9".repeat(400));
    await field.trigger("blur");
    await flushPromises();

    expect(getProductionsSpy).toHaveBeenCalledTimes(1);
    expect((field.element as HTMLInputElement).value).toBe("1");

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    wrapper.unmount();
  });

  it("resets the page field when the committed value is empty", async () => {
    const getProductionsSpy = vi.spyOn(productionsService, "getProductions");
    getProductionsSpy.mockResolvedValue({
      items: [mockProduction],
      total: 45,
    });

    const { wrapper } = await mountView();
    const field = wrapper.find('input[inputmode="numeric"]');

    await field.setValue("");
    await field.trigger("blur");
    await flushPromises();

    expect(getProductionsSpy).toHaveBeenCalledTimes(1);
    expect((field.element as HTMLInputElement).value).toBe("1");

    wrapper.unmount();
  });

  it("scrolls via fallback when the page anchor has no scrollIntoView", async () => {
    const orig = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "scrollIntoView",
    );
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: undefined,
    });

    const getProductionsSpy = vi.spyOn(productionsService, "getProductions");
    getProductionsSpy.mockResolvedValue({
      items: [mockProduction],
      total: 45,
    });

    try {
      const { wrapper } = await mountView();
      const field = wrapper.find('input[inputmode="numeric"]');
      await field.setValue("2");
      await field.trigger("blur");
      await flushPromises();

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      expect(wrapper.text()).toContain("De voorstelling");
      wrapper.unmount();
    } finally {
      if (orig) {
        Object.defineProperty(HTMLElement.prototype, "scrollIntoView", orig);
      }
    }
  });

  it("uses the page query for the initial list fetch", async () => {
    const getProductionsSpy = vi.spyOn(productionsService, "getProductions");
    getProductionsSpy.mockResolvedValue({
      items: [mockProduction],
      total: 45,
    });

    const { wrapper, router } = await mountView("/nl/productions?page=3");
    expect(getProductionsSpy).toHaveBeenCalledWith({
      limit: 20,
      offset: 40,
      ...DEFAULT_LIST_FETCH_OPTS,
    });
    expect(router.currentRoute.value.query.page).toBe("3");
    wrapper.unmount();
  });

  it("drops page=1 from the URL after load", async () => {
    const router = createRouter({ history: createMemoryHistory(), routes });
    await router.push({ path: "/nl/productions", query: { page: "1" } });
    await router.isReady();

    const wrapper = mount(routerViewRoot, {
      global: { plugins: [router, i18n] },
      attachTo: document.body,
    });
    await flushPromises();

    expect(router.currentRoute.value.query.page).toBeUndefined();
    wrapper.unmount();
  });

  it("normalizes an out-of-range page query after load", async () => {
    const getProductionsSpy = vi.spyOn(productionsService, "getProductions");
    getProductionsSpy.mockResolvedValue({
      items: [mockProduction],
      total: 45,
    });

    const { wrapper, router } = await mountView("/nl/productions?page=99");
    expect(router.currentRoute.value.query.page).toBe("3");
    expect(getProductionsSpy).toHaveBeenLastCalledWith({
      limit: 20,
      offset: 40,
      ...DEFAULT_LIST_FETCH_OPTS,
    });
    wrapper.unmount();
  });

  it("refetches when the page query changes after load", async () => {
    const getProductionsSpy = vi.spyOn(productionsService, "getProductions");
    getProductionsSpy.mockResolvedValue({
      items: [mockProduction],
      total: 45,
    });

    const { wrapper, router } = await mountView("/nl/productions?page=2");
    expect(getProductionsSpy).toHaveBeenLastCalledWith({
      limit: 20,
      offset: 20,
      ...DEFAULT_LIST_FETCH_OPTS,
    });

    await router.replace({
      path: "/nl/productions",
      query: {},
    });
    await flushPromises();

    expect(getProductionsSpy).toHaveBeenLastCalledWith({
      limit: 20,
      offset: 0,
      ...DEFAULT_LIST_FETCH_OPTS,
    });
    wrapper.unmount();
  });

  it("clamps the page query via navigation after load", async () => {
    const getProductionsSpy = vi.spyOn(productionsService, "getProductions");
    getProductionsSpy.mockResolvedValue({
      items: [mockProduction],
      total: 45,
    });

    const { wrapper, router } = await mountView("/nl/productions?page=2");
    await flushPromises();

    await router.replace({
      path: "/nl/productions",
      query: { page: "99" },
    });
    await flushPromises();

    expect(router.currentRoute.value.query.page).toBe("3");
    wrapper.unmount();
  });

  it("shows an error when a route-driven page fetch fails", async () => {
    const getProductionsSpy = vi.spyOn(productionsService, "getProductions");
    getProductionsSpy
      .mockResolvedValueOnce({
        items: [mockProduction],
        total: 45,
      })
      .mockRejectedValueOnce(new Error("network"));

    const { wrapper, router } = await mountView("/nl/productions");
    expect(wrapper.text()).not.toContain("niet worden geladen");

    await router.replace({
      path: "/nl/productions",
      query: { page: "2" },
    });
    await flushPromises();

    expect(wrapper.text()).toContain("niet worden geladen");
    wrapper.unmount();
  });

  it("updates the page query when using pagination controls", async () => {
    const getProductionsSpy = vi.spyOn(productionsService, "getProductions");
    getProductionsSpy.mockResolvedValue({
      items: [mockProduction],
      total: 45,
    });

    const { wrapper, router } = await mountView();
    const nextBtn = wrapper
      .findAll("button")
      .find((b) => b.text() === "Volgende");
    expect(nextBtn).toBeDefined();
    await nextBtn!.trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.query.page).toBe("2");
    wrapper.unmount();
  });

  it("skips unknown tags and tags with empty localized names", async () => {
    vi.spyOn(productionsService, "getProductions").mockResolvedValue({
      items: [
        {
          ...mockProduction,
          tags: [7, 99, 8] as unknown as ProductionWithBackwardsRefs["tags"],
        } as ProductionWithBackwardsRefs,
      ],
      total: 1,
    });
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

  it("loads tag filter from the URL", async () => {
    const getSpy = vi.spyOn(productionsService, "getProductions");
    getSpy.mockResolvedValue({ items: [mockProduction], total: 1 });
    const { wrapper } = await mountView("/nl/productions?tags=7");
    expect(getSpy).toHaveBeenCalledWith(
      expect.objectContaining({ tagIds: [7] }),
    );
    wrapper.unmount();
  });

  it("prefers calendar dates over year span when both are in the URL", async () => {
    const getSpy = vi.spyOn(productionsService, "getProductions");
    getSpy.mockResolvedValue({ items: [mockProduction], total: 1 });
    const { wrapper } = await mountView(
      "/nl/productions?yearMin=2010&yearMax=2020&from=2025-01-01&to=2025-06-01",
    );
    const first = getSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(first).toMatchObject({
      dateFrom: "2025-01-01",
      dateTo: "2025-06-01",
    });
    expect(first).not.toHaveProperty("yearMin");
    wrapper.unmount();
  });

  it("shows date-range validation when a filter request returns 400 with code", async () => {
    vi.spyOn(tagsService, "getTagTypes").mockResolvedValue([mockTagTypeGenre]);
    const getSpy = vi.spyOn(productionsService, "getProductions");
    let calls = 0;
    getSpy.mockImplementation(() => {
      calls++;
      if (calls === 1) {
        return Promise.resolve({ items: [mockProduction], total: 1 });
      }
      return Promise.reject(
        new ApiError(
          400,
          "bad",
          undefined,
          undefined,
          PRODUCTION_LIST_ERROR_CODE.DATE_RANGE_ORDER,
        ),
      );
    });
    const { wrapper } = await mountView();
    const genreBtn = wrapper
      .findAll("button")
      .find((b) => b.text() === "Theater");
    expect(genreBtn).toBeDefined();
    await genreBtn!.trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("begindatum");
    wrapper.unmount();
  });

  it("shows year-range validation when a filter request returns 400 with year code", async () => {
    vi.spyOn(tagsService, "getTagTypes").mockResolvedValue([mockTagTypeGenre]);
    const getSpy = vi.spyOn(productionsService, "getProductions");
    let calls = 0;
    getSpy.mockImplementation(() => {
      calls++;
      if (calls === 1) {
        return Promise.resolve({ items: [mockProduction], total: 1 });
      }
      return Promise.reject(
        new ApiError(
          400,
          "bad",
          undefined,
          undefined,
          PRODUCTION_LIST_ERROR_CODE.YEAR_RANGE_ORDER,
        ),
      );
    });
    const { wrapper } = await mountView();
    const genreBtn = wrapper
      .findAll("button")
      .find((b) => b.text() === "Theater");
    await genreBtn!.trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("eerste jaar");
    wrapper.unmount();
  });

  it("maps 400 errors without code using shared messages", async () => {
    vi.spyOn(tagsService, "getTagTypes").mockResolvedValue([mockTagTypeGenre]);
    const getSpy = vi.spyOn(productionsService, "getProductions");
    let calls = 0;
    getSpy.mockImplementation(() => {
      calls++;
      if (calls === 1) {
        return Promise.resolve({ items: [mockProduction], total: 1 });
      }
      return Promise.reject(
        new ApiError(400, PRODUCTION_LIST_YEAR_RANGE_ORDER_MESSAGE),
      );
    });
    const { wrapper } = await mountView();
    const genreBtn = wrapper
      .findAll("button")
      .find((b) => b.text() === "Theater");
    await genreBtn!.trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("eerste jaar");
    wrapper.unmount();
  });

  it("clears non-search filters when clicking clear all filters", async () => {
    const getSpy = vi.spyOn(productionsService, "getProductions");
    getSpy.mockResolvedValue({ items: [mockProduction], total: 1 });
    const { wrapper } = await mountView("/nl/productions?tags=7");
    const clearAll = wrapper
      .findAll("button")
      .find((b) => b.text() === "Alle filters wissen");
    expect(clearAll).toBeDefined();
    await clearAll!.trigger("click");
    await flushPromises();
    expect(getSpy).toHaveBeenLastCalledWith({
      limit: 20,
      offset: 0,
      ...DEFAULT_LIST_FETCH_OPTS,
    });
    wrapper.unmount();
  });

  it("removes a tag chip when its remove control is used", async () => {
    const getSpy = vi.spyOn(productionsService, "getProductions");
    getSpy.mockResolvedValue({ items: [mockProduction], total: 1 });
    const { wrapper } = await mountView("/nl/productions?tags=7");
    const removeChip = wrapper.find('[aria-label="Tagfilter verwijderen"]');
    expect(removeChip.exists()).toBe(true);
    await removeChip.trigger("click");
    await flushPromises();
    expect(getSpy).toHaveBeenLastCalledWith({
      limit: 20,
      offset: 0,
      ...DEFAULT_LIST_FETCH_OPTS,
    });
    wrapper.unmount();
  });

  it("shows more genre tags after expanding the list", async () => {
    // Need more items than the fallback row fit to guarantee expand control in JSDOM.
    const manyGenres: Tag[] = Array.from({ length: 11 }, (_, i) => ({
      id: 100 + i,
      old_id: null,
      name: { nl: `Genre ${i + 1}` },
      tag_type: 1 as unknown as Tag["tag_type"],
      public: true,
    })) as Tag[];
    vi.spyOn(tagsService, "getTags").mockResolvedValue(manyGenres);
    vi.spyOn(tagsService, "getTagTypes").mockResolvedValue([mockTagTypeGenre]);
    const { wrapper } = await mountView();
    const expandFilters = wrapper.find(
      '[aria-label="Filters uitklappen"]',
    );
    expect(expandFilters.exists()).toBe(true);
    await expandFilters.trigger("click");
    await nextTick();
    const more = wrapper.find('[aria-label="Meer tonen"]');
    expect(more.exists()).toBe(true);
    await more.trigger("click");
    await nextTick();
    expect(wrapper.text()).toContain("Genre 11");
    wrapper.unmount();
  });

  it("shows more non-genre tags after expanding that list", async () => {
    const typeOther = { id: 2, name: { nl: "Leeftijd" } } as TagType;
    // Collapsed cap is NON_GENRE_FILTER_COLLAPSED_MAX (6); need 7+ tags for the expand control.
    const nonGenreTags: Tag[] = Array.from({ length: 7 }, (_, i) => ({
      id: 300 + i,
      old_id: null,
      name: { nl: `Extra ${i + 1}` },
      tag_type: 2 as unknown as Tag["tag_type"],
      public: true,
    })) as Tag[];
    vi.spyOn(tagsService, "getTags").mockResolvedValue(nonGenreTags);
    vi.spyOn(tagsService, "getTagTypes").mockResolvedValue([typeOther]);
    const { wrapper } = await mountView();
    const expandFilters = wrapper.find(
      '[aria-label="Filters uitklappen"]',
    );
    expect(expandFilters.exists()).toBe(true);
    await expandFilters.trigger("click");
    await nextTick();
    const more = wrapper.find('[aria-label="Meer tonen"]');
    expect(more.exists()).toBe(true);
    await more.trigger("click");
    await nextTick();
    expect(wrapper.text()).toContain("Extra 7");
    wrapper.unmount();
  });

  it("ignores page query changes when the list has no pages", async () => {
    vi.spyOn(productionsService, "getProductions").mockResolvedValue({
      items: [],
      total: 0,
    });
    const { wrapper, router } = await mountView("/nl/productions");
    await router.replace({ path: "/nl/productions", query: { page: "3" } });
    await flushPromises();
    expect(wrapper.exists()).toBe(true);
    wrapper.unmount();
  });

  it("shows no-filter-results copy when filters yield zero productions", async () => {
    vi.spyOn(productionsService, "getProductions").mockResolvedValue({
      items: [],
      total: 0,
    });
    const { wrapper } = await mountView("/nl/productions?tags=7");
    expect(wrapper.text()).toContain("Geen producties gevonden met deze filters");
    wrapper.unmount();
  });

  it("shows a single calendar year on the chip when yearMin equals yearMax", async () => {
    vi.spyOn(productionsService, "getProductions").mockResolvedValue({
      items: [mockProduction],
      total: 1,
    });
    const { wrapper } = await mountView("/nl/productions?yearMin=2015&yearMax=2015");
    expect(wrapper.text()).toContain("2015");
    expect(wrapper.text()).not.toContain("2015–2015");
    wrapper.unmount();
  });

  it("removes the year span when the year chip control is activated", async () => {
    const getSpy = vi.spyOn(productionsService, "getProductions");
    getSpy.mockResolvedValue({ items: [mockProduction], total: 1 });
    const { wrapper } = await mountView("/nl/productions?yearMin=2015&yearMax=2020");
    await wrapper.find('[aria-label="Jaarbereik verwijderen"]').trigger("click");
    await flushPromises();
    expect(getSpy).toHaveBeenLastCalledWith({
      limit: 20,
      offset: 0,
      ...DEFAULT_LIST_FETCH_OPTS,
    });
    wrapper.unmount();
  });

  it("removes the calendar range when the date chip control is activated", async () => {
    const getSpy = vi.spyOn(productionsService, "getProductions");
    getSpy.mockResolvedValue({ items: [mockProduction], total: 1 });
    const { wrapper } = await mountView(
      "/nl/productions?from=2025-01-01&to=2025-06-01",
    );
    await wrapper
      .find('[aria-label="Datumbereik verwijderen"]')
      .trigger("click");
    await flushPromises();
    expect(getSpy).toHaveBeenLastCalledWith({
      limit: 20,
      offset: 0,
      ...DEFAULT_LIST_FETCH_OPTS,
    });
    wrapper.unmount();
  });

  it("deselects a genre tag when its chip is toggled off", async () => {
    vi.spyOn(tagsService, "getTagTypes").mockResolvedValue([mockTagTypeGenre]);
    const getSpy = vi.spyOn(productionsService, "getProductions");
    getSpy.mockResolvedValue({ items: [mockProduction], total: 1 });
    const { wrapper } = await mountView("/nl/productions?tags=7");
    const genreBtn = wrapper
      .findAll("button")
      .find((b) => b.text() === "Theater");
    await genreBtn!.trigger("click");
    await flushPromises();
    expect(getSpy).toHaveBeenLastCalledWith({
      limit: 20,
      offset: 0,
      ...DEFAULT_LIST_FETCH_OPTS,
    });
    wrapper.unmount();
  });

  it("loads sort options from the URL and passes them to the API", async () => {
    const getSpy = vi.spyOn(productionsService, "getProductions");
    getSpy.mockResolvedValue({ items: [mockProduction], total: 1 });
    const { wrapper } = await mountView(
      "/nl/productions?sortBy=name&sortDir=asc",
    );
    expect(getSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sortBy: "name",
        sortDir: "asc",
        lang: "nl",
      }),
    );
    wrapper.unmount();
  });

  it("refetches from page 1 when the sort select changes", async () => {
    const getSpy = vi.spyOn(productionsService, "getProductions");
    getSpy.mockResolvedValue({ items: [mockProduction], total: 45 });
    const { wrapper, router } = await mountView(
      "/nl/productions?page=2&sortBy=name&sortDir=asc",
    );
    expect(getSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ limit: 20, offset: 20 }),
    );

    const dimBtn = wrapper.find("#productions-sort-dimension");
    expect(dimBtn.exists()).toBe(true);
    await dimBtn.trigger("click");
    await wrapper.find('[data-sort-metric="date"]').trigger("click");
    await flushPromises();

    expect(getSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sortBy: "date",
        sortDir: "asc",
        offset: 0,
        lang: "nl",
      }),
    );
    expect(router.currentRoute.value.query.page).toBeUndefined();
    wrapper.unmount();
  });
});
