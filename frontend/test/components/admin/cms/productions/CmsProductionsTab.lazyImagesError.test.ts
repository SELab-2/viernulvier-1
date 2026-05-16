import { afterEach, describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { defineComponent } from "vue";
import { i18n } from "@/i18n";
import CmsProductionsTab from "@/components/admin/cms/productions/CmsProductionsTab.vue";
import * as productionsService from "@/services/productions";
import * as imagesService from "@/services/images";
import * as tagsService from "@/services/tags";
import * as hallsService from "@/services/halls";
import * as eventsService from "@/services/events";

vi.mock("@/services/productions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/productions")>();
  return {
    ...actual,
    getProductions: vi.fn().mockResolvedValue({
      items: [
        {
          id: 1,
          old_id: null,
          finalized: true,
          supertitle: { en: "Series" },
          title: { en: "Show" },
          artist: { en: "Artist" },
          tagline: { en: "Tagline" },
          teaser: { en: "Teaser" },
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
        },
      ],
      total: 1,
    }),
    createProduction: vi.fn(),
    bulkUpdateProductions: vi.fn(),
    updateProduction: vi.fn(),
    deleteProduction: vi.fn(),
  };
});

vi.mock("@/services/images", () => ({
  getImagesByProduction: vi.fn(),
  getImage: vi.fn(),
  deleteImage: vi.fn(),
}));
vi.mock("@/services/tags", () => ({ getAllTags: vi.fn(), getTagTypes: vi.fn() }));
vi.mock("@/services/halls", () => ({ getHalls: vi.fn(), getHall: vi.fn() }));
vi.mock("@/services/events", () => ({ createEvent: vi.fn(), deleteEvent: vi.fn(), getEvent: vi.fn(), updateEvent: vi.fn() }));

const gridStub = defineComponent({
  name: "AgGridVue",
  props: {
    rowData: {
      type: Array,
      default: () => [],
    },
  },
  template: `<div data-testid="ag-grid-stub">{{ rowData.length }}</div>`,
});

async function mountTab() {
  const wrapper = mount(CmsProductionsTab, {
    global: {
      plugins: [i18n],
      stubs: {
        AgGridVue: gridStub,
      },
    },
  });

  await flushPromises();
  return wrapper;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("CmsProductionsTab lazy image error handling", () => {
  it("does not throw when image load fails and logs silently", async () => {
    vi.stubEnv("MODE", "development");
    vi.mocked(imagesService.getImagesByProduction).mockRejectedValue(new Error("nope"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(tagsService.getAllTags).mockResolvedValue([]);
    vi.mocked(tagsService.getTagTypes).mockResolvedValue([]);
    vi.mocked(hallsService.getHalls).mockResolvedValue([]);
    vi.mocked(eventsService.getEvent).mockResolvedValue({} as any);

    vi.mocked(tagsService.getAllTags).mockResolvedValue([]);
    vi.mocked(tagsService.getTagTypes).mockResolvedValue([]);
    vi.mocked(hallsService.getHalls).mockResolvedValue([]);
    vi.mocked(eventsService.getEvent).mockResolvedValue({} as any);

    const wrapper = await mountTab();

    const api = (wrapper.vm as any).$?.exposed.__test;
    expect(api.imagesByProductionId.value instanceof Map).toBe(true);
  });

  it("populates imagesByProductionId when images and preferred crop exist", async () => {
    vi.stubEnv("MODE", "development");
    vi.mocked(imagesService.getImagesByProduction).mockResolvedValue([{ id: 11, crops: [{ type: "cms", url: "/1.jpg" }] } as any]);

    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;

    for (let i = 0; i < 10 && !api.imagesByProductionId.value.get(1); i += 1) {
      await flushPromises();
    }

    expect(api.imagesByProductionId.value.get(1)).toEqual([{ id: 11, url: `${window.location.origin}/1.jpg` }]);
  });

  it("keeps imagesByProductionId empty when a production has no images", async () => {
    vi.stubEnv("MODE", "development");
    vi.mocked(imagesService.getImagesByProduction).mockResolvedValue([]);

    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;

    await flushPromises();

    expect(api.imagesByProductionId.value.size).toBe(0);
  });
});
