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
import { __reset as resetDarkMode } from "@/composables/useDarkMode";
import ProductionsView from "@/views/ProductionsView.vue";
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

describe("ProductionsView.vue", () => {
  beforeEach(() => {
    vi.spyOn(productionsService, "getProductions").mockResolvedValue({
      items: [mockProduction],
      total: 1,
    });
    vi.spyOn(tagsService, "getTags").mockResolvedValue([mockTag]);
    vi.spyOn(tagsService, "getTagTypes").mockResolvedValue([mockTagTypeGenre]);
    vi.spyOn(eventsService, "getEvents").mockResolvedValue([mockEvent]);
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
    expect(productionsService.getProductions).toHaveBeenCalledWith({
      limit: 20,
      offset: 0,
    });
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

    const wrapper = mount(ProductionsView, {
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
    });
    expect(router.currentRoute.value.query.page).toBe("3");
    wrapper.unmount();
  });

  it("drops page=1 from the URL after load", async () => {
    const router = createRouter({ history: createMemoryHistory(), routes });
    await router.push({ path: "/nl/productions", query: { page: "1" } });
    await router.isReady();

    const wrapper = mount(ProductionsView, {
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
    });

    await router.replace({
      path: "/nl/productions",
      query: {},
    });
    await flushPromises();

    expect(getProductionsSpy).toHaveBeenLastCalledWith({
      limit: 20,
      offset: 0,
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
});
