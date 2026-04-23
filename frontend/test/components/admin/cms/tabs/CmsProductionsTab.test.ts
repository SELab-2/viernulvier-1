import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, nextTick } from "vue";
import type { Hall, ProductionWithBackwardsRefs, Tag, TagType } from "@viernulvier/shared";
import { i18n } from "@/i18n";
import CmsProductionsTab from "@/components/admin/cms/tabs/CmsProductionsTab.vue";
import * as productionsService from "@/services/productions";
import * as tagsService from "@/services/tags";
import * as hallsService from "@/services/halls";
import * as eventsService from "@/services/events";

vi.mock("@/services/productions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/productions")>();
  return {
    ...actual,
    getProductions: vi.fn(),
    createProduction: vi.fn(),
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
  tags: [2, 1] as unknown as ProductionWithBackwardsRefs["tags"],
  events: [] as unknown as ProductionWithBackwardsRefs["events"],
} as ProductionWithBackwardsRefs;

const mockPublicTag = {
  id: 1,
  old_id: null,
  name: { en: "PublicTag" },
  tag_type: 1 as never,
  public: true,
} as Tag;

const mockHiddenTag = {
  id: 2,
  old_id: null,
  name: { en: "HiddenTag" },
  tag_type: 2 as never,
  public: false,
} as Tag;

const mockTagTypes = [
  { id: 1, name: { en: "Genre", nl: "Genre", fr: "Genre" } },
  { id: 2, name: { en: "Theme", nl: "Thema", fr: "Theme" } },
] as TagType[];

const mockHall = {
  id: 1,
  old_id: null,
  address: "Street",
  name: { en: "Main hall" },
} as Hall;

describe("CmsProductionsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(productionsService, "getProductions").mockResolvedValue({ items: [mockProduction], total: 1 });
    vi.spyOn(productionsService, "createProduction").mockResolvedValue(mockProduction);
    vi.spyOn(productionsService, "updateProduction").mockResolvedValue(mockProduction);
    vi.spyOn(productionsService, "deleteProduction").mockResolvedValue(undefined);
    vi.spyOn(tagsService, "getAllTags").mockResolvedValue([mockPublicTag, mockHiddenTag]);
    vi.spyOn(tagsService, "getTagTypes").mockResolvedValue(mockTagTypes);
    vi.spyOn(hallsService, "getHalls").mockResolvedValue([mockHall]);
    vi.spyOn(eventsService, "createEvent").mockResolvedValue({
      id: 100,
      hall: mockHall.id,
      starts_at: new Date().toISOString(),
      ends_at: new Date().toISOString(),
      doors_at: new Date().toISOString(),
      info: { nl: "" },
      production: mockProduction.id,
    } as never);
    vi.spyOn(eventsService, "updateEvent").mockResolvedValue({ id: 100 } as never);
    vi.spyOn(eventsService, "deleteEvent").mockResolvedValue(undefined);
    vi.spyOn(eventsService, "getEvent").mockResolvedValue({
      id: 100,
      hall: mockHall.id,
      starts_at: new Date().toISOString(),
      ends_at: new Date().toISOString(),
      doors_at: new Date().toISOString(),
      info: { nl: "" },
      production: mockProduction.id,
    } as never);
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

  it("loads CMS data on mount", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    expect(api.rowData.value.length).toBe(1);
    expect(productionsService.getProductions).toHaveBeenCalledTimes(1);
    expect(tagsService.getAllTags).toHaveBeenCalledTimes(1);
    expect(tagsService.getTagTypes).toHaveBeenCalledTimes(1);
    expect(hallsService.getHalls).toHaveBeenCalledTimes(1);
  });

  it("validates create modal and creates production", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;

    api.openCreateModal();
    await api.submitCreateProduction();
    expect(api.createError.value).toBeTruthy();

    api.createForm.value.title.nl = "Title";
    api.createForm.value.artist.nl = "Artist";
    api.createForm.value.tagline.nl = "Tagline";
    api.createForm.value.teaser.nl = "Teaser";
    api.createForm.value.video_1.nl = "data:image/png;base64,abc";

    await api.submitCreateProduction();
    expect(productionsService.createProduction).toHaveBeenCalledTimes(1);
    expect(api.createModalOpen.value).toBe(false);
  });

  it("opens editor panel and saves long text", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = api.rowData.value[0];

    api.onCellClicked({
      data: row,
      colDef: { field: "descriptionOne", headerName: "Description" },
    });

    expect(api.editorPanel.value).toBeTruthy();
    await api.saveEditorPanel();
    expect(productionsService.updateProduction).toHaveBeenCalled();
  });

  it("handles inline edit commit and revert branches", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = api.rowData.value[0];
    const setDataValue = vi.fn();

    await api.onCellEditingStopped({
      data: row,
      value: "new",
      oldValue: "old",
      colDef: { field: "performer" },
      node: { setDataValue },
    });
    expect(setDataValue).toHaveBeenCalledWith("performer", "old");

    api.onProductionCellKeyDown({
      data: row,
      colDef: { field: "performer" },
      event: new KeyboardEvent("keydown", { key: "Enter" }),
    });

    await api.onCellEditingStopped({
      data: row,
      value: "Changed",
      oldValue: "Artist",
      colDef: { field: "performer" },
      node: { setDataValue: vi.fn() },
    });
    expect(productionsService.updateProduction).toHaveBeenCalled();
  });

  it("opens events panel and handles save/remove event", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = api.rowData.value[0];

    row.source.events = [100];
    await api.showEventsForProduction(row);
    expect(api.selectedEventsProductionId.value).toBe(row.id);

    const eventRow = {
      id: 100,
      startsAt: "2026-04-13T10:00",
      endsAt: "2026-04-13T12:00",
      doorsAt: "2026-04-13T09:30",
      hallId: mockHall.id,
      infoNl: "note",
      date: "",
      time: "",
      location: "",
      price: "",
    };

    await api.saveLinkedEvent(eventRow);
    await api.removeLinkedEvent(eventRow);

    expect(eventsService.updateEvent).toHaveBeenCalled();
    expect(eventsService.deleteEvent).toHaveBeenCalled();
  });

  it("covers create event validation and success", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;

    api.selectedEventsProductionId.value = mockProduction.id;
    api.createLinkedEventForm.value.hallId = 0;
    await api.createAndLinkEvent();
    expect(api.eventsPanelError.value).toContain("hall");

    api.createLinkedEventForm.value.hallId = mockHall.id;
    api.createLinkedEventForm.value.startsAt = "2026-04-13T10:00";
    api.createLinkedEventForm.value.endsAt = "2026-04-13T12:00";
    api.createLinkedEventForm.value.doorsAt = "2026-04-13T09:30";
    await api.createAndLinkEvent();
    expect(eventsService.createEvent).toHaveBeenCalled();
  });

  it("covers focus-out revert and refresh missing-row branch", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = api.rowData.value[0];

    row.source.events = [100];
    await api.showEventsForProduction(row);

    const firstEventRow = api.selectedEventRows.value[0];
    const oldStarts = firstEventRow.startsAt;
    firstEventRow.startsAt = "2030-01-01T10:00";

    api.onEventRowFocusOut(firstEventRow, {
      currentTarget: document.createElement("div"),
      relatedTarget: null,
    } as unknown as FocusEvent);

    expect(firstEventRow.startsAt).toBe(oldStarts);

    api.selectedEventsProductionId.value = 99999;
    await api.refreshEventsPanelForSelectedProduction();
    expect(api.selectedEventsProductionId.value).toBeNull();
  });

  it("covers file upload handlers", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;

    class FileReaderMock {
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      result = "data:mock;base64,abc";
      readAsDataURL() {
        this.onload?.();
      }
    }

    const originalFileReader = (globalThis as any).FileReader;
    (globalThis as any).FileReader = FileReaderMock;

    const imageInputEvent = {
      target: {
        files: [new File(["x"], "a.png", { type: "image/png" })],
        value: "x",
      },
    } as unknown as Event;

    const videoInputEvent = {
      target: {
        files: [new File(["x"], "a.mp4", { type: "video/mp4" })],
        value: "x",
      },
    } as unknown as Event;

    await api.onImageFileChange(imageInputEvent);
    await api.onVideoFileChange(videoInputEvent);

    expect(api.createForm.value.video_1.nl).toContain("data:mock");
    expect(api.createForm.value.video_2.nl).toContain("data:mock");

    (globalThis as any).FileReader = originalFileReader;
  });

  it("shows load error when cms data fails", async () => {
    vi.spyOn(productionsService, "getProductions").mockRejectedValueOnce(new Error("boom"));
    const wrapper = await mountTab();
    expect(wrapper.text()).toMatch(/Could not load|Kon CMS-gegevens niet laden/i);
  });

  it("covers remove confirm guards and successful delete flow", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;

    api.openRemoveProductionsConfirm();
    expect(api.removeConfirmOpen.value).toBe(false);
    expect(api.removeConfirmError.value).toBeNull();

    const deselectAll = vi.fn();
    api.selectedCount.value = 1;
    api.gridApi.value = {
      getSelectedRows: () => [{ id: mockProduction.id }],
      deselectAll,
    };

    api.openRemoveProductionsConfirm();
    expect(api.removeConfirmOpen.value).toBe(true);

    await api.confirmRemoveProductions();
    expect(productionsService.deleteProduction).toHaveBeenCalledWith(mockProduction.id);
    expect(deselectAll).toHaveBeenCalled();
    expect(api.removeConfirmOpen.value).toBe(false);
    expect(api.removeConfirmError.value).toBeNull();
  });

  it("covers media preview image, youtube, video and unsupported branches", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;

    api.openMediaPreview("https://example.com/image.jpg", "Image");
    expect(api.mediaPreview.value?.kind).toBe("image");

    api.openMediaPreview("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "Video");
    expect(api.mediaPreview.value?.kind).toBe("youtube");
    expect(api.mediaPreview.value?.url).toContain("youtube.com/embed/");

    api.openMediaPreview("https://example.com/video.webm", "Video");
    expect(api.mediaPreview.value?.kind).toBe("video");

    api.closeMediaPreview();
    expect(api.mediaPreview.value).toBeNull();

    api.openMediaPreview("https://example.com/file.txt", "Text");
    expect(api.mediaPreview.value).toBeNull();

    api.openMediaPreview("https://youtu.be/", "Broken");
    expect(api.mediaPreview.value).toBeNull();
  });

  it("covers quick filter and column chooser event branches", async () => {
    const wrapper = await mountTab();

    const controls = wrapper.findComponent({ name: "CmsGridControls" });
    controls.vm.$emit("update:quick-filter-text", "needle");
    controls.vm.$emit("apply-quick-filter");
    controls.vm.$emit("toggle-columns");
    await flushPromises();

    const chooser = wrapper.findComponent({ name: "CmsColumnChooser" });
    expect(chooser.props("show")).toBe(true);

    controls.vm.$emit("toggle-columns");
    await flushPromises();
    expect(chooser.props("show")).toBe(false);
  });

  it("covers guard branches for no-op paths", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;

    await api.onCellEditingStopped({ data: null, colDef: { field: "performer" }, node: { setDataValue: vi.fn() } });
    await api.onCellEditingStopped({ data: api.rowData.value[0], colDef: { field: "unknown" }, node: { setDataValue: vi.fn() } });
    api.onProductionCellKeyDown({ data: api.rowData.value[0], colDef: { field: "performer" }, event: new KeyboardEvent("keydown", { key: "Escape" }) });
    api.onWindowKeyDown(new KeyboardEvent("keydown", { key: "Enter" }));
    api.onCellClicked({ data: null, colDef: { field: "descriptionOne" } });
    api.onCellClicked({ data: api.rowData.value[0], colDef: { colId: "x" } });
    api.onCellClicked({ data: api.rowData.value[0], colDef: { field: "unknown" } });

    api.selectedEventsProductionId.value = null;
    await api.saveLinkedEvent({ id: 100, startsAt: "", endsAt: "", doorsAt: "", hallId: 1, infoNl: "", date: "", time: "", location: "", price: "" });
    await api.removeLinkedEvent({ id: 100, startsAt: "", endsAt: "", doorsAt: "", hallId: 1, infoNl: "", date: "", time: "", location: "", price: "" });
    await api.createAndLinkEvent();
    await api.saveEditorPanel();

    expect(eventsService.updateEvent).not.toHaveBeenCalled();
    expect(eventsService.deleteEvent).not.toHaveBeenCalled();
  });

  it("covers error branches for mutate actions", async () => {
    vi.spyOn(eventsService, "updateEvent").mockRejectedValueOnce(new Error("update failed"));
    vi.spyOn(eventsService, "deleteEvent").mockRejectedValueOnce(new Error("delete failed"));
    vi.spyOn(eventsService, "createEvent").mockRejectedValueOnce(new Error("create failed"));
    vi.spyOn(productionsService, "deleteProduction").mockRejectedValueOnce(new Error("remove failed"));

    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = api.rowData.value[0];

    row.source.events = [100];
    await api.showEventsForProduction(row);

    const eventRow = {
      id: 100,
      startsAt: "2026-04-13T10:00",
      endsAt: "2026-04-13T12:00",
      doorsAt: "2026-04-13T09:30",
      hallId: mockHall.id,
      infoNl: "note",
      date: "",
      time: "",
      location: "",
      price: "",
    };

    await api.saveLinkedEvent(eventRow);
    expect(api.eventsPanelError.value).toBeTruthy();

    await api.removeLinkedEvent(eventRow);
    expect(api.eventsPanelError.value).toBeTruthy();

    api.createLinkedEventForm.value.hallId = mockHall.id;
    api.createLinkedEventForm.value.startsAt = "2026-04-13T10:00";
    api.createLinkedEventForm.value.endsAt = "2026-04-13T12:00";
    api.createLinkedEventForm.value.doorsAt = "2026-04-13T09:30";
    await api.createAndLinkEvent();
    expect(api.eventsPanelError.value).toBeTruthy();

    api.selectedCount.value = 1;
    api.gridApi.value = {
      getSelectedRows: () => [{ id: mockProduction.id }],
      deselectAll: vi.fn(),
    };
    api.openRemoveProductionsConfirm();
    await api.confirmRemoveProductions();
    expect(api.removeConfirmError.value).toBeTruthy();
  });

  it("covers create event modal submit branches", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;

    api.openCreateEventModal();
    expect(api.createEventModalOpen.value).toBe(true);

    api.selectedEventsProductionId.value = mockProduction.id;
    api.createLinkedEventForm.value.hallId = 0;
    await api.submitCreateEvent();
    expect(api.createEventModalOpen.value).toBe(true);

    api.createLinkedEventForm.value.hallId = mockHall.id;
    api.createLinkedEventForm.value.startsAt = "2026-04-13T10:00";
    api.createLinkedEventForm.value.endsAt = "2026-04-13T12:00";
    api.createLinkedEventForm.value.doorsAt = "2026-04-13T09:30";
    await api.submitCreateEvent();
    expect(api.createEventModalOpen.value).toBe(false);

    api.closeCreateEventModal();
    expect(api.createEventModalOpen.value).toBe(false);
  });

  it("covers show events error branch", async () => {
    vi.spyOn(eventsService, "getEvent").mockRejectedValueOnce(new Error("cannot load event"));

    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = api.rowData.value[0];
    row.source.events = [100];

    await api.showEventsForProduction(row);
    expect(api.eventsPanelError.value).toBeTruthy();
  });

  it("covers additional guard branches and media preview edge cases", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;

    api.openMediaPreview("   ", "Empty");
    expect(api.mediaPreview.value).toBeNull();

    await api.onImageFileChange({ target: { files: [], value: "x" } } as unknown as Event);
    await api.onVideoFileChange({ target: { files: [], value: "x" } } as unknown as Event);

    api.removeConfirmOpen.value = true;
    api.gridApi.value = {
      getSelectedRows: () => [],
      deselectAll: vi.fn(),
    };
    await api.confirmRemoveProductions();
    expect(api.removeConfirmOpen.value).toBe(false);

    await api.refreshEventsPanelForSelectedProduction();
    await api.createAndLinkEvent();

    const eventRow = {
      id: 100,
      startsAt: "2026-04-13T10:00",
      endsAt: "2026-04-13T12:00",
      doorsAt: "2026-04-13T09:30",
      hallId: mockHall.id,
      infoNl: "note",
      date: "",
      time: "",
      location: "",
      price: "",
    };
    const container = document.createElement("div");
    const child = document.createElement("button");
    container.appendChild(child);
    const oldStartsAt = eventRow.startsAt;
    eventRow.startsAt = "2030-01-01T10:00";
    api.onEventRowFocusOut(eventRow, { currentTarget: container, relatedTarget: child } as unknown as FocusEvent);
    expect(eventRow.startsAt).toBe("2030-01-01T10:00");
    expect(eventRow.startsAt).not.toBe(oldStartsAt);
  });

  it("covers template event branches for modal and column chooser", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;

    api.openCreateModal();
    await flushPromises();
    const createModal = wrapper.findComponent({ name: "CmsCreateProductionModal" });

    createModal.vm.$emit("update-finalized", true);
    createModal.vm.$emit("update-extra-lang", "en", true);
    createModal.vm.$emit("update-extra-lang", "fr", true);
    await flushPromises();

    expect(api.createForm.value.finalized).toBe(true);

    createModal.vm.$emit("close");
    await flushPromises();

    expect(api.createForm.value.finalized).toBe(false);
    expect(api.createModalOpen.value).toBe(false);

    const controls = wrapper.findComponent({ name: "CmsGridControls" });
    controls.vm.$emit("toggle-columns");
    await flushPromises();
    const chooser = wrapper.findComponent({ name: "CmsColumnChooser" });
    expect(chooser.props("show")).toBe(true);
    chooser.vm.$emit("close");
    await flushPromises();
    expect(chooser.props("show")).toBe(false);
  });

  it("covers editor save branches for missing row and save error", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = api.rowData.value[0];

    api.editorPanel.value = {
      rowId: 99999,
      apiField: "description",
      label: "Description",
      values: { nl: "x", en: "", fr: "" },
    };
    await api.saveEditorPanel();

    vi.spyOn(productionsService, "updateProduction").mockRejectedValueOnce(new Error("cannot save"));
    api.onCellClicked({
      data: row,
      colDef: { field: "descriptionOne", headerName: "Description" },
    });

    await expect(api.saveEditorPanel()).rejects.toThrow();
    expect(api.editorPanel.value).toBeTruthy();
  });

  it("covers inline editing branches for same value and enter key path", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = api.rowData.value[0];

    api.onProductionCellEditingStarted({ data: row, colDef: { field: "performer" } });
    api.onWindowKeyDown(new KeyboardEvent("keydown", { key: "Enter" }));

    const setDataValue = vi.fn();
    await api.onCellEditingStopped({
      data: row,
      value: "Artist",
      oldValue: "Artist",
      colDef: { field: "performer" },
      node: { setDataValue },
    });

    expect(productionsService.updateProduction).not.toHaveBeenCalledWith(row.id, expect.anything());
    expect(setDataValue).not.toHaveBeenCalled();
  });

  it("covers remaining edge branches: empty/cached events, getHall fetch, generic errors and watcher", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = api.rowData.value[0];

    api.createLinkedEventForm.value.hallId = 0;
    row.source.events = [];
    await api.showEventsForProduction(row);
    expect(api.selectedEventRows.value).toEqual([]);
    expect(api.createLinkedEventForm.value.hallId).toBe(mockHall.id);

    row.source.events = [100];
    api.detailRowsCache.value.delete(row.id);
    vi.spyOn(eventsService, "getEvent").mockResolvedValueOnce({
      id: 100,
      hall: 999,
      starts_at: new Date().toISOString(),
      ends_at: new Date().toISOString(),
      doors_at: new Date().toISOString(),
      info: { nl: "" },
      production: mockProduction.id,
    } as never);
    await api.showEventsForProduction(row);
    expect(hallsService.getHall).toHaveBeenCalledWith(999);

    const getEventCallsAfterFirstLoad = vi.mocked(eventsService.getEvent).mock.calls.length;
    await api.showEventsForProduction(row);
    expect(vi.mocked(eventsService.getEvent).mock.calls.length).toBe(getEventCallsAfterFirstLoad);

    api.openRemoveProductionsConfirm();
    expect(api.removeConfirmOpen.value).toBe(false);

    vi.spyOn(productionsService, "createProduction").mockRejectedValueOnce("boom" as never);
    api.createForm.value.title.nl = "Title";
    api.createForm.value.artist.nl = "Artist";
    api.createForm.value.tagline.nl = "Tagline";
    api.createForm.value.teaser.nl = "Teaser";
    api.createForm.value.video_1.nl = "data:image/png;base64,abc";
    await api.submitCreateProduction();
    expect(api.createError.value).toBeTruthy();

    api.onCellClicked({ data: row, colDef: {} });
    api.onCellClicked({ data: row, colDef: { field: "media", headerName: "Media" } });
    expect(api.editorPanel.value?.apiField).toBe("video_1");

    api.onCellClicked({ data: row, colDef: { field: "descriptionOne" } });
    expect(api.editorPanel.value?.label).toBe(i18n.global.t("cms.panel.text"));

    row.source.title = { nl: "Titel NL", en: "Title EN", fr: "Titre FR" } as never;
    api.rebuildRows();
    i18n.global.locale.value = "en";
    await nextTick();
    const englishTitle = api.rowData.value[0]?.title;
    i18n.global.locale.value = "nl";
    await nextTick();
    expect(api.rowData.value[0]?.title).not.toBe(englishTitle);
  });

  it("passes selected primary/additional tags when creating a production", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;

    api.openCreateModal();
    await flushPromises();

    const createModal = wrapper.findComponent({ name: "CmsCreateProductionModal" });
    createModal.vm.$emit("update-primary-tag", 1);
    createModal.vm.$emit("toggle-tag", 2, true);

    api.createForm.value.title.nl = "Title";
    api.createForm.value.artist.nl = "Artist";
    api.createForm.value.tagline.nl = "Tagline";
    api.createForm.value.teaser.nl = "Teaser";
    api.createForm.value.video_1.nl = "data:image/png;base64,abc";

    await api.submitCreateProduction();

    expect(productionsService.createProduction).toHaveBeenCalledWith(
      expect.objectContaining({ tags: [1, 2] }),
    );
  });

  it("covers tag editor panel guards and toggle behavior", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = api.rowData.value[0];

    api.toggleTagEditorTag(2, true);
    await api.saveTagEditorPanel();

    api.tagEditorPanel.value = { rowId: 99999, label: "missing", selectedTagIds: [2] };
    await api.saveTagEditorPanel();
    expect(productionsService.updateProduction).not.toHaveBeenCalled();

    api.openTagEditorPanel(row);
    expect(api.tagEditorPanel.value?.selectedTagIds).toContain(2);

    api.toggleTagEditorTag(2, false);
    expect(api.tagEditorPanel.value?.selectedTagIds).toEqual([]);

    api.closeTagEditorPanel();
    expect(api.tagEditorPanel.value).toBeNull();
  });

  it("saves additional tags and handles tag editor save failures", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = api.rowData.value[0];

    api.openTagEditorPanel(row);
    await api.saveTagEditorPanel();

    expect(productionsService.updateProduction).toHaveBeenCalledWith(
      row.id,
      expect.objectContaining({ tags: expect.arrayContaining([1, 2]) }),
    );

    vi.spyOn(productionsService, "updateProduction").mockRejectedValueOnce("boom" as never);
    api.openTagEditorPanel(row);
    await api.saveTagEditorPanel();

    expect(api.tagEditorPanel.value).toBeTruthy();
  });

  it("covers genres edit branch with unchanged, invalid, success and failure paths", async () => {
    const comedyTag = {
      id: 3,
      old_id: null,
      name: { en: "Comedy" },
      tag_type: 1 as never,
      public: true,
    } as Tag;
    vi.spyOn(tagsService, "getAllTags").mockResolvedValue([mockPublicTag, mockHiddenTag, comedyTag]);

    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = api.rowData.value[0];
    const setDataValue = vi.fn();

    await api.onCellEditingStopped({
      data: row,
      value: "PublicTag",
      oldValue: "PublicTag",
      colDef: { field: "genres" },
      node: { setDataValue },
    });

    await api.onCellEditingStopped({
      data: row,
      value: "Unknown",
      oldValue: "PublicTag",
      colDef: { field: "genres" },
      node: { setDataValue },
    });
    expect(setDataValue).toHaveBeenCalledWith("genres", "PublicTag");

    await api.onCellEditingStopped({
      data: row,
      value: "Comedy",
      oldValue: "PublicTag",
      colDef: { field: "genres" },
      node: { setDataValue: vi.fn() },
    });
    expect(productionsService.updateProduction).toHaveBeenCalledWith(
      row.id,
      expect.objectContaining({ tags: [3, 2] }),
    );

    vi.spyOn(productionsService, "updateProduction").mockRejectedValueOnce(new Error("save failed"));
    const revertSpy = vi.fn();
    await api.onCellEditingStopped({
      data: row,
      value: "Comedy",
      oldValue: "PublicTag",
      colDef: { field: "genres" },
      node: { setDataValue: revertSpy },
    });
    expect(revertSpy).toHaveBeenCalledWith("genres", "PublicTag");
  });

  it("opens tag editor from tags cell click and covers unmount cleanup", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = api.rowData.value[0];

    api.onCellClicked({ data: row, colDef: { field: "tags" } });
    expect(api.tagEditorPanel.value?.rowId).toBe(row.id);

    wrapper.unmount();
  });
});
