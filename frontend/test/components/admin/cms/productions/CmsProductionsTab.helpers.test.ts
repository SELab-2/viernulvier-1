import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { i18n } from "@/i18n";
import CmsProductionsTab from "@/components/admin/cms/productions/CmsProductionsTab.vue";
import { defineComponent } from "vue";
import * as productionsService from "@/services/productions";
import * as tagsService from "@/services/tags";
import * as hallsService from "@/services/halls";
import * as eventsService from "@/services/events";

// Minimal mocks copied from the main spec so mounting populates expected refs
vi.mock("@/services/productions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/productions")>();
  return {
    ...actual,
    getProduction: vi.fn(),
    getProductions: vi.fn(),
    createProduction: vi.fn(),
    bulkUpdateProductions: vi.fn(),
    updateProduction: vi.fn(),
    deleteProduction: vi.fn(),
  };
});

vi.mock("@/services/tags", () => ({
  getAllTags: vi.fn(),
  getTagTypes: vi.fn(),
}));

vi.mock("@/services/halls", () => ({
  getHalls: vi.fn(),
  getHall: vi.fn(),
}));

vi.mock("@/services/events", () => ({
  createEvent: vi.fn(),
  deleteEvent: vi.fn(),
  getEvent: vi.fn(),
  updateEvent: vi.fn(),
}));

const mockProduction = {
  id: 42,
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
  tags: [2, 1],
  events: [],
} as any;

const mockPublicTag = { id: 1, old_id: null, name: { en: "PublicTag" }, tag_type: 1 as never, public: true } as any;
const mockHiddenTag = { id: 2, old_id: null, name: { en: "HiddenTag" }, tag_type: 2 as never, public: false } as any;
const mockTagTypes = [ { id: 1, name: { en: "Genre", nl: "Genre", fr: "Genre" } }, { id: 2, name: { en: "Theme", nl: "Thema", fr: "Theme" } } ] as any;
const mockHall = { id: 1, old_id: null, address: "Street", name: { en: "Main hall" } } as any;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(productionsService, "getProduction").mockResolvedValue(mockProduction);
  vi.spyOn(productionsService, "getProductions").mockResolvedValue({ items: [mockProduction], total: 1 } as any);
  vi.spyOn(productionsService, "createProduction").mockResolvedValue(mockProduction as any);
  vi.spyOn(productionsService, "bulkUpdateProductions").mockResolvedValue([mockProduction] as any);
  vi.spyOn(productionsService, "updateProduction").mockResolvedValue(mockProduction as any);
  vi.spyOn(productionsService, "deleteProduction").mockResolvedValue(undefined as any);
  vi.spyOn(tagsService, "getAllTags").mockResolvedValue([mockPublicTag, mockHiddenTag] as any);
  vi.spyOn(tagsService, "getTagTypes").mockResolvedValue(mockTagTypes as any);
  vi.spyOn(hallsService, "getHalls").mockResolvedValue([mockHall] as any);
  vi.spyOn(eventsService, "createEvent").mockResolvedValue({ id: 100, hall: mockHall.id, starts_at: new Date().toISOString(), ends_at: new Date().toISOString(), doors_at: new Date().toISOString(), info: { nl: "" }, production: mockProduction.id } as any);
  vi.spyOn(eventsService, "updateEvent").mockResolvedValue({ id: 100 } as any);
  vi.spyOn(eventsService, "deleteEvent").mockResolvedValue(undefined as any);
  vi.spyOn(eventsService, "getEvent").mockResolvedValue({ id: 100, hall: mockHall.id, starts_at: new Date().toISOString(), ends_at: new Date().toISOString(), doors_at: new Date().toISOString(), info: { nl: "" }, production: mockProduction.id } as any);
});

const gridStub = defineComponent({
  name: "AgGridVue",
  props: { rowData: { type: Array, default: () => [] } },
  template: `<div/>`,
});

describe("CmsProductionsTab helpers", () => {
  it("formatTagNames fallback and +N behaviour, setCurrentLanguageValue and edit key", async () => {
    const wrapper = mount(CmsProductionsTab, { global: { plugins: [i18n], stubs: { AgGridVue: gridStub } } });
    await flushPromises();
    const api = (wrapper.vm as any).$?.exposed.__test;

    // set up tags data with one known tag
    api.tagsData.value = [{ id: 1, name: { nl: "Een" } }, { id: 2, name: { nl: "Twee" } }];

    // known tags
    const names = api.formatTagNames([1, 2]);
    expect(names).toContain("Een");

    // unknown tag falls back to Tag X
    const fallback = api.formatTagNames([999]);
    expect(fallback).toContain("Tag 999");

    // +N behaviour: maxCount default 5 -> use 6 ids
    const many = api.formatTagNames([1,2,3,4,5,6]);
    expect(many).toMatch(/\+1$/);

    // setCurrentLanguageValue when map is null
    const m = api.setCurrentLanguageValue(null, "x");
    expect(Object.values(m)).toContain("x");

    // edit key
    expect(api.getProductionEditKey(12, "perf")).toBe("12:perf");
  });

  // snapshotEventRows and revertEventRow are internal; exercise via onEventRowFocusOut instead
  it("onEventRowFocusOut reverts values when focus leaves container", async () => {
    const wrapper = mount(CmsProductionsTab, { global: { plugins: [i18n], stubs: { AgGridVue: gridStub } } });
    await flushPromises();
    const api = (wrapper.vm as any).$?.exposed.__test;

    const row = api.rowData.value[0];
    row.source.events = [100];
    await api.showEventsForProduction(row);
    const first = api.selectedEventRows.value[0];
    const old = first.startsAt;
    first.startsAt = "2030-01-01T10:00";
    api.onEventRowFocusOut(first, { currentTarget: document.createElement("div"), relatedTarget: null } as unknown as FocusEvent);
    expect(first.startsAt).toBe(old);
  });

  it("resetCreateLinkedEventForm picks hall from hallsData and allows setters and toggles", async () => {
    const wrapper = mount(CmsProductionsTab, { global: { plugins: [i18n], stubs: { AgGridVue: gridStub } } });
    await flushPromises();
    const api = (wrapper.vm as any).$?.exposed.__test;

    // when no halls, hallId becomes 0
    api.hallsData.value = [];
    api.resetCreateLinkedEventForm();
    expect(api.createLinkedEventForm.value.hallId).toBe(0);

    // when halls present, pick first
    api.hallsData.value = [{ id: 77, name: { nl: "H" }, address: "x" }];
    api.resetCreateLinkedEventForm();
    expect(api.createLinkedEventForm.value.hallId).toBe(77);

    // set field directly on exposed form
    api.createLinkedEventForm.value.infoNl = "note";
    expect(api.createLinkedEventForm.value.infoNl).toBe("note");

    api.createForm.value.title.nl = "T";
    expect(api.createForm.value.title.nl).toBe("T");
  });

  it("closeSecondaryTagBulkMode and confirmSecondaryTagBulkReplace/ Diff guards", async () => {
    const wrapper = mount(CmsProductionsTab, { global: { plugins: [i18n], stubs: { AgGridVue: gridStub } } });
    await flushPromises();
    const api = (wrapper.vm as any).$?.exposed.__test;

    api.secondaryTagBulkModeOpen.value = true;
    api.secondaryTagBulkModeLoading.value = true;
    api.secondaryTagBulkModeTagsPreview.value = "x";

    api.closeSecondaryTagBulkMode();
    expect(api.secondaryTagBulkModeOpen.value).toBe(false);

    // when tagEditorPanel absent, confirm calls should not throw
    api.tagEditorPanel.value = null;
    await api.confirmSecondaryTagBulkReplace();
    await api.confirmSecondaryTagBulkDiff();
  });
});
