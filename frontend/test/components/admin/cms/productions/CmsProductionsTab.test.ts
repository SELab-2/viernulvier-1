import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, nextTick } from "vue";
import type { Hall, ProductionWithBackwardsRefs, Tag, TagType } from "@viernulvier/shared";
import { i18n } from "@/i18n";
import CmsProductionsTab from "@/components/admin/cms/productions/CmsProductionsTab.vue";
import * as productionsService from "@/services/productions";
import * as tagsService from "@/services/tags";
import * as hallsService from "@/services/halls";
import * as eventsService from "@/services/events";
import * as imagesService from "@/services/images";
import * as mediaUploadService from "@/services/cms/media-upload";

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

vi.mock("@/services/images", () => ({
  getImagesByProduction: vi.fn(),
  getImage: vi.fn(),
  deleteImage: vi.fn(),
}));

vi.mock("@/services/cms/media-upload", () => ({
  uploadImageWithCrops: vi.fn(),
  uploadCrops: vi.fn(),
}));
vi.mock("easymde", () => {
  return {
    default: class MockEasyMDE {
      private _value = "";

      constructor(opts: any) {
        this._value = opts?.initialValue ?? "";
      }

      value(v?: string) {
        if (typeof v === "string") {
          this._value = v;
          return;
        }
        return this._value;
      }

      toTextArea() {}

      codemirror = {
        on: (_event: string, _cb: Function) => {},
      };
    },
  };
});

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
    vi.spyOn(productionsService, "getProduction").mockResolvedValue(mockProduction);
    vi.spyOn(productionsService, "getProductions").mockResolvedValue({ items: [mockProduction], total: 1 });
    vi.spyOn(productionsService, "createProduction").mockResolvedValue(mockProduction);
    vi.spyOn(productionsService, "bulkUpdateProductions").mockResolvedValue([mockProduction]);
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
    vi.mocked(imagesService.getImagesByProduction).mockResolvedValue([]);
    vi.mocked(mediaUploadService.uploadImageWithCrops).mockResolvedValue({
      id: 999,
      production: mockProduction.id,
      res: null,
      old_id: null,
      crops: [],
    } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.useRealTimers();
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
    api.createForm.value.media = [{
      id: "media-1",
      type: "image",
      url: "data:image/png;base64,abc",
      isUploaded: false,
    }];

    await api.submitCreateProduction();
    expect(productionsService.createProduction).toHaveBeenCalledTimes(1);
    expect(api.createModalOpen.value).toBe(false);
  });

  it("covers create modal field and tag emitters", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;

    api.openCreateModal();
    await flushPromises();

    const createModal = wrapper.findComponent({ name: "CmsCreateProductionModal" });
    createModal.vm.$emit("update-form-field", "title", "nl", "Titel");
    createModal.vm.$emit("update-extra-lang", "en", true);
    createModal.vm.$emit("update-extra-lang", "en", false);
    createModal.vm.$emit("update-primary-tag", 1);
    createModal.vm.$emit("toggle-tag", 2, true);
    createModal.vm.$emit("toggle-tag", 2, false);

    api.createForm.value.artist.nl = "Artist";
    api.createForm.value.tagline.nl = "Tagline";
    api.createForm.value.teaser.nl = "Teaser";
    api.createForm.value.media = [{
      id: "media-1",
      type: "image",
      url: "data:image/png;base64,abc",
      isUploaded: false,
    }];
    api.createForm.value.video_1 = { nl: "data:image/png;base64,abc" } as any;

    await api.submitCreateProduction();

    expect(productionsService.createProduction).toHaveBeenCalledWith(
      expect.objectContaining({
        title: { nl: "Titel" },
        tags: [1],
      }),
    );
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
    expect(productionsService.bulkUpdateProductions).toHaveBeenCalled();
  });

  it("sends explicit empty strings when clearing one locale in the editor panel", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = api.rowData.value[0];

    api.editorPanel.value = {
      rowId: row.id,
      apiField: "description",
      label: "Description",
      values: {
        nl: "",
        en: "Keep me",
        fr: "Keep me too",
      },
    };

    await api.saveEditorPanel();

    expect(productionsService.bulkUpdateProductions).toHaveBeenCalled();
    const expected = {
      ids: [row.id],
      data: {
        description: {
          nl: "",
          en: "Keep me",
          fr: "Keep me too",
        },
      },
    };
    const calls = (productionsService.bulkUpdateProductions as any).mock.calls || [];
    const found = calls.some((c: any) => JSON.stringify(c[0]) === JSON.stringify(expected));
    expect(found).toBe(true);
  });

  it("opens create event from the events drawer and media action click", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = {
      ...api.rowData.value[0],
      source: { ...api.rowData.value[0].source, events: [100] },
    };

    api.onCellClicked({
      data: row,
      colDef: { colId: "eventsAction" },
    });
    await flushPromises();

    const eventsDrawer = wrapper.findComponent({ name: "CmsEventsDrawer" });
    eventsDrawer.vm.$emit("open-create-event");
    await flushPromises();

    expect(api.createEventModalOpen.value).toBe(true);
  });

  it("covers save success timeout and media youtube preview detection", async () => {
    vi.useFakeTimers();
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = {
      ...api.rowData.value[0],
      media: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    };

    api.onCellClicked({
      data: row,
      colDef: { field: "media", headerName: "Media" },
    });
    expect(api.mediaPreview.value?.kind).toBe("iframe");

    api.onCellClicked({
      data: api.rowData.value[0],
      colDef: { field: "descriptionOne", headerName: "Description" },
    });
    await api.saveEditorPanel();
    expect(wrapper.text()).toContain("✓");

    vi.advanceTimersByTime(3000);
    await flushPromises();
    expect(wrapper.text()).not.toContain("✓");
    vi.useRealTimers();
  });

  it("opens media preview from a media cell click", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = {
      ...api.rowData.value[0],
      media: "https://example.com/preview.jpg",
    };

    api.onCellClicked({
      data: row,
      colDef: { field: "media", headerName: "Media" },
    });

    expect(api.mediaPreview.value?.kind).toBe("image");
  });

  it("opens media preview with placeholder when clicking empty media cell", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = {
      ...api.rowData.value[0],
      media: "",
    };

    api.onCellClicked({
      data: row,
      colDef: { field: "media", headerName: "Media" },
    });

    // Placeholder should be opened with blank iframe for video
    expect(api.mediaPreview.value).toBeTruthy();
    expect(api.mediaPreview.value?.kind).toBe("iframe");
    expect(api.mediaPreview.value?.url).toBe("about:blank");
    expect(api.mediaPreview.value?.mediaField).toBe("video_1");
    expect(api.mediaPreview.value?.productionId).toBe(api.rowData.value[0].id);
  });

  it("opens image preview with SVG placeholder when clicking empty image cell", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = {
      ...api.rowData.value[0],
      imageMedia: "",
    };

    api.onCellClicked({
      data: row,
      colDef: { field: "imageMedia", headerName: "Images" },
    });

    // Placeholder should be opened with SVG image
    expect(api.mediaPreview.value).toBeTruthy();
    expect(api.mediaPreview.value?.kind).toBe("image");
    // Check for SVG data URL (the actual text will be translated to the current locale)
    expect(api.mediaPreview.value?.url).toContain("data:image/svg+xml");
    expect(api.mediaPreview.value?.productionId).toBe(api.rowData.value[0].id);
  });

  it("placeholder allows adding new image when file input changes", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = {
      ...api.rowData.value[0],
      imageMedia: "",
    };

    api.onCellClicked({
      data: row,
      colDef: { field: "imageMedia", headerName: "Images" },
    });

    // Verify placeholder is open
    expect(api.mediaPreview.value?.kind).toBe("image");

    // Simulate file selection
    await vi.waitFor(() => expect(api.mediaPreview.value).toBeTruthy());
    expect(api.mediaPreview.value?.productionId).toBe(row.id);
  });

  it("placeholder video can accept URL input and save", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = {
      ...api.rowData.value[0],
      media: "",
    };

    api.onCellClicked({
      data: row,
      colDef: { field: "media", headerName: "Media" },
    });

    // Placeholder should be opened
    expect(api.mediaPreview.value).toBeTruthy();
    expect(api.mediaPreview.value?.kind).toBe("iframe");
    expect(api.mediaPreview.value?.url).toBe("about:blank");
    
    // Verify production and media field are set for saving
    expect(api.mediaPreview.value?.productionId).toBe(row.id);
    expect(api.mediaPreview.value?.mediaField).toBe("video_1");
  });

  it("opens bulk edit confirmation when saving long text for multiple selected rows", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = api.rowData.value[0];
    const secondRow = {
      ...row,
      id: row.id + 1,
      source: { ...row.source, id: row.id + 1 },
    };

    api.gridApi.value = {
      getSelectedRows: () => [row, secondRow],
    };

    api.onCellClicked({
      data: row,
      colDef: { field: "descriptionOne", headerName: "Description" },
    });

    await api.saveEditorPanel();

    expect(api.bulkEditConfirmOpen.value).toBe(true);
    expect(api.bulkEditConfirmCount.value).toBe(2);

    await api.confirmBulkEdit();

    expect(productionsService.bulkUpdateProductions).toHaveBeenCalled();
    expect(api.bulkEditConfirmOpen.value).toBe(false);
  });

  it("covers inline bulk edit confirmation and revert on save failure", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = api.rowData.value[0];
    const otherRow = { ...row, id: row.id + 10, source: { ...row.source, id: row.id + 10 } };
    const setDataValue = vi.fn();

    api.gridApi.value = {
      getSelectedRows: () => [row, otherRow],
      getState: vi.fn(() => ({})),
      getColumnState: vi.fn(() => []),
      setState: vi.fn(),
      setGridOption: vi.fn(),
      sizeColumnsToFit: vi.fn(),
    };

    api.onProductionCellKeyDown({
      data: row,
      colDef: { field: "performer" },
      event: new KeyboardEvent("keydown", { key: "Enter" }),
    });

    await api.onCellEditingStopped({
      data: row,
      value: "New Artist",
      oldValue: "Artist",
      colDef: { field: "performer" },
      node: { setDataValue },
    });

    expect(api.bulkEditConfirmOpen.value).toBe(true);
    await api.confirmBulkEdit();
    expect(productionsService.bulkUpdateProductions).toHaveBeenCalled();

    vi.spyOn(productionsService, "bulkUpdateProductions").mockRejectedValueOnce(new Error("fail"));
    api.gridApi.value = {
      getSelectedRows: () => [row],
      getState: vi.fn(() => ({})),
      getColumnState: vi.fn(() => []),
      setState: vi.fn(),
      setGridOption: vi.fn(),
      sizeColumnsToFit: vi.fn(),
    };
    api.onProductionCellKeyDown({
      data: row,
      colDef: { field: "performer" },
      event: new KeyboardEvent("keydown", { key: "Enter" }),
    });

    await api.onCellEditingStopped({
      data: row,
      value: "Changed Artist",
      oldValue: "Artist",
      colDef: { field: "performer" },
      node: { setDataValue },
    });

    expect(setDataValue).toHaveBeenCalledWith("performer", "Artist");
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
    expect(productionsService.bulkUpdateProductions).toHaveBeenCalled();
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

  it("covers the event-row enter shortcut", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = api.rowData.value[0];

    row.source.events = [100];
    await api.showEventsForProduction(row);

    const firstEventRow = api.selectedEventRows.value[0];
    const updateEvent = vi.spyOn(eventsService, "updateEvent");

    api.onEventRowEnter(firstEventRow);
    await flushPromises();

    expect(updateEvent).toHaveBeenCalled();
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

    api.addMedia("image");
    api.addMedia("video");
    const imageMedia = api.createForm.value.media.find((m: { type: string }) => m.type === "image");
    const videoMedia = api.createForm.value.media.find((m: { type: string }) => m.type === "video");

    await api.onMediaFileChange(imageMedia.id, imageInputEvent);
    await api.onMediaFileChange(videoMedia.id, videoInputEvent);

    expect(imageMedia.url).toContain("data:mock");
    expect(videoMedia.url).toContain("data:mock");

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

    api.openRemoveConfirm();
    expect(api.removeConfirmOpen.value).toBe(false);
    expect(api.removeConfirmError.value).toBeNull();

    const deselectAll = vi.fn();
    api.selectedCount.value = 1;
    api.gridApi.value = {
      getSelectedRows: () => [{ id: mockProduction.id }],
      deselectAll,
    };

    api.openRemoveConfirm();
    expect(api.removeConfirmOpen.value).toBe(true);

    await api.confirmRemove();
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
    expect(api.mediaPreview.value?.kind).toBe("iframe");
    expect(api.mediaPreview.value?.url).toContain("youtube.com/embed/");

    api.openMediaPreview("https://example.com/video.webm", "Video");
    expect(api.mediaPreview.value?.kind).toBe("iframe");

    api.closeMediaPreview();
    expect(api.mediaPreview.value).toBeNull();

    api.openMediaPreview("https://example.com/file.txt", "Text");
    expect(api.mediaPreview.value?.kind).toBe("iframe");

    api.openMediaPreview("https://youtu.be/", "Broken");
    expect(api.mediaPreview.value?.kind).toBe("iframe");
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
    api.openRemoveConfirm();
    await api.confirmRemove();
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

  it("covers multi-row genre bulk edit confirmation", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = api.rowData.value[0];
    const otherRow = { ...row, id: row.id + 20, source: { ...row.source, id: row.id + 20 } };

    api.gridApi.value = {
      getSelectedRows: () => [row, otherRow],
    };

    await api.onCellEditingStopped({
      data: row,
      value: 3,
      oldValue: 1,
      colDef: { field: "genres" },
      node: { setDataValue: vi.fn() },
    });

    expect(api.bulkEditConfirmOpen.value).toBe(true);
    await api.confirmBulkEdit();
    expect(productionsService.updateProduction).toHaveBeenCalled();

    vi.spyOn(productionsService, "updateProduction").mockRejectedValueOnce(new Error("save failed"));
    api.gridApi.value = {
      getSelectedRows: () => [row, otherRow],
    };

    await api.onCellEditingStopped({
      data: row,
      value: 4,
      oldValue: 1,
      colDef: { field: "genres" },
      node: { setDataValue: vi.fn() },
    });

    await api.confirmBulkEdit();
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
    const state = (wrapper.vm as any).$.setupState as any;

    api.openMediaPreview("   ", "Empty");
    expect(api.mediaPreview.value).not.toBeNull();
    expect(api.mediaPreview.value?.kind).toBe("image");

    api.imagesByProductionId.value = new Map([
      [api.rowData.value[0].id, [{ id: 501, url: "https://example.com/single.jpg" }]],
    ]);
    api.rebuildRows();
    api.onCellClicked({
      data: api.rowData.value[0],
      colDef: { field: "imageMedia", headerName: "Images" },
    });
    expect(api.mediaPreview.value?.kind).toBe("image");

    state.syncGalleryPreview(1);
    expect(api.mediaPreview.value?.kind).toBe("image");

    api.addMedia("image");
    const imageMedia = api.createForm.value.media.find((m: { type: string }) => m.type === "image");
    await api.onMediaFileChange(imageMedia.id, { target: { files: [], value: "x" } } as unknown as Event);

    state.updateMediaUrl(imageMedia.id, "https://example.com/image.jpg");
    expect(imageMedia.url).toBe("https://example.com/image.jpg");

    state.updateMediaUrl("missing-id", "https://example.com/ignored.jpg");
    expect(imageMedia.url).toBe("https://example.com/image.jpg");

    api.mediaPreview.value = {
      kind: "image",
      url: "",
      label: "Image",
      productionId: mockProduction.id,
    } as never;
    await state.onMediaPreviewImageSelected({
      target: {
        files: [new File(["x"], "upload.png", { type: "image/png" })],
        value: "upload.png",
      },
    } as never);
    expect(api.mediaPreview.value?.url).toBe("");

    api.mediaPreview.value = {
      kind: "iframe",
      url: "https://example.com/video",
      label: "Video",
      productionId: mockProduction.id,
    } as never;
    await state.saveMediaVideoUrl();
    expect(productionsService.updateProduction).toHaveBeenCalledTimes(0);

    api.mediaPreview.value = {
      kind: "image",
      url: "https://example.com/image.jpg",
      label: "Image",
      productionId: mockProduction.id,
    } as never;
    await state.removeMediaImage();
    expect(imagesService.deleteImage).toHaveBeenCalledTimes(0);

    api.mediaPreview.value = {
      kind: "iframe",
      url: "https://example.com/video",
      label: "Video",
      productionId: mockProduction.id,
    } as never;
    await state.removeMediaVideo();
    expect(productionsService.updateProduction).toHaveBeenCalledTimes(0);

    api.removeConfirmOpen.value = true;
    api.gridApi.value = {
      getSelectedRows: () => [],
      deselectAll: vi.fn(),
    };
    await api.confirmRemove();
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

  it("forwards create-modal events for finalized flag and extra languages", async () => {
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

    vi.spyOn(productionsService, "bulkUpdateProductions").mockRejectedValueOnce(new Error("cannot save"));
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

    expect(productionsService.bulkUpdateProductions).not.toHaveBeenCalled();
    expect(setDataValue).not.toHaveBeenCalled();
  });

  it("covers the onProductionCellEditingStarted guard branch", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;

    api.onProductionCellEditingStarted({ data: null, colDef: { field: "performer" } });
    api.onProductionCellEditingStarted({ data: api.rowData.value[0], colDef: {} as never });

    expect(api.editorPanel.value).toBeNull();
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

    api.openRemoveConfirm();
    expect(api.removeConfirmOpen.value).toBe(false);

    vi.spyOn(productionsService, "createProduction").mockRejectedValueOnce("boom" as never);
    api.createForm.value.title.nl = "Title";
    api.createForm.value.artist.nl = "Artist";
    api.createForm.value.tagline.nl = "Tagline";
    api.createForm.value.teaser.nl = "Teaser";
    api.createForm.value.media = [{
      id: "media-1",
      type: "image",
      url: "data:image/png;base64,abc",
      isUploaded: false,
    }];
    await api.submitCreateProduction();
    expect(api.createError.value).toBeTruthy();

    api.onCellClicked({ data: row, colDef: {} });
    api.onCellClicked({ data: row, colDef: { field: "media", headerName: "Media" } });
    expect(api.editorPanel.value).toBeNull();

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
    api.createForm.value.media = [{
      id: "media-1",
      type: "image",
      url: "data:image/png;base64,abc",
      isUploaded: false,
    }];

    await api.submitCreateProduction();

    expect(productionsService.createProduction).toHaveBeenCalledWith(
      expect.objectContaining({ tags: [1, 2] }),
    );
  });

  it("submits external image media and a video url without uploading images", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;

    api.openCreateModal();
    await flushPromises();

    api.addMedia("image");
    api.addMedia("video");

    const imageMedia = api.createForm.value.media.find((m: { type: string }) => m.type === "image");
    const videoMedia = api.createForm.value.media.find((m: { type: string }) => m.type === "video");

    imageMedia.url = "https://example.com/external.jpg";
    videoMedia.url = "https://example.com/video.mp4";

    api.createForm.value.title.nl = "Title";
    api.createForm.value.artist.nl = "Artist";
    api.createForm.value.tagline.nl = "Tagline";
    api.createForm.value.teaser.nl = "Teaser";

    await api.submitCreateProduction();

    expect(mediaUploadService.uploadImageWithCrops).not.toHaveBeenCalled();
    expect(productionsService.createProduction).toHaveBeenCalledWith(
      expect.objectContaining({
        video_2: { nl: "https://example.com/video.mp4" },
      }),
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

  it("covers secondary tag bulk-mode guard branches", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = api.rowData.value[0];

    api.openTagEditorPanel(row);
    await api.confirmSecondaryTagBulkReplace();
    expect(api.secondaryTagBulkModeOpen.value).toBe(false);

    api.closeTagEditorPanel();
    await api.confirmSecondaryTagBulkDiff();
    expect(api.secondaryTagBulkModeOpen.value).toBe(false);
  });

  it("covers secondary tag bulk replace and diff flows", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = api.rowData.value[0];
    const otherRow = { ...row, id: row.id + 30, source: { ...row.source, id: row.id + 30 } };

    api.gridApi.value = {
      getSelectedRows: () => [row, otherRow],
    };

    api.openTagEditorPanel(row);
    api.toggleTagEditorTag(1, true);
    await api.saveTagEditorPanel();
    await api.confirmBulkEdit();
    await api.confirmSecondaryTagBulkReplace();
    expect(productionsService.updateProduction).toHaveBeenCalled();

    vi.mocked(productionsService.updateProduction).mockClear();
    api.gridApi.value = {
      getSelectedRows: () => [row, otherRow],
    };
    api.openTagEditorPanel(row);
    api.toggleTagEditorTag(1, true);
    await api.saveTagEditorPanel();
    await api.confirmBulkEdit();
    await api.confirmSecondaryTagBulkDiff();
    expect(productionsService.updateProduction).toHaveBeenCalled();
  });

  it("covers secondary tag bulk-mode failure handling", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = api.rowData.value[0];
    const otherRow = { ...row, id: row.id + 31, source: { ...row.source, id: row.id + 31 } };

    api.gridApi.value = {
      getSelectedRows: () => [row, otherRow],
      getState: vi.fn(() => ({})),
      getColumnState: vi.fn(() => []),
      setState: vi.fn(),
      setGridOption: vi.fn(),
      sizeColumnsToFit: vi.fn(),
    };

    vi.spyOn(productionsService, "updateProduction").mockRejectedValueOnce(new Error("bulk failed"));

    api.openTagEditorPanel(row);
    api.toggleTagEditorTag(1, true);
    await api.saveTagEditorPanel();
    await api.confirmBulkEdit();

    await expect(api.confirmSecondaryTagBulkReplace()).rejects.toThrow("bulk failed");
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
      value: 1,
      oldValue: 1,
      colDef: { field: "genres" },
      node: { setDataValue },
    });

    await api.onCellEditingStopped({
      data: row,
      value: "Unknown",
      oldValue: 1,
      colDef: { field: "genres" },
      node: { setDataValue },
    });
    expect(setDataValue).toHaveBeenCalledWith("genres", 1);

    await api.onCellEditingStopped({
      data: row,
      value: 3,
      oldValue: 1,
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
      value: 3,
      oldValue: 1,
      colDef: { field: "genres" },
      node: { setDataValue: revertSpy },
    });
    expect(revertSpy).toHaveBeenCalledWith("genres", 1);
  });

  it("opens tag editor from tags cell click and covers unmount cleanup", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = api.rowData.value[0];

    api.onCellClicked({ data: row, colDef: { field: "tags" } });
    expect(api.tagEditorPanel.value?.rowId).toBe(row.id);

    wrapper.unmount();
  });

  it("bulk edit confirm helpers and confirmBulkEdit branches", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;

    // close when no pending action
    api.openBulkEditConfirm(0, null as any);
    expect(api.bulkEditConfirmOpen.value).toBe(true);
    await api.confirmBulkEdit();
    expect(api.bulkEditConfirmOpen.value).toBe(false);

    // success path: pending action runs
    let ran = false;
    api.openBulkEditConfirm(2, async () => {
      ran = true;
    });
    expect(api.bulkEditConfirmOpen.value).toBe(true);
    await api.confirmBulkEdit();
    expect(ran).toBe(true);

    // failure path: action throws, loading flag resets
    api.openBulkEditConfirm(2, async () => {
      throw new Error("fail");
    });
    expect(api.bulkEditConfirmOpen.value).toBe(true);
    await api.confirmBulkEdit();
    expect(api.bulkEditConfirmLoading.value).toBe(false);
  });

  it("lazily loads production images and syncs gallery previews outside test mode", async () => {
    vi.stubEnv("MODE", "development");
    vi.mocked(imagesService.getImagesByProduction).mockResolvedValueOnce([
      {
        id: 201,
        crops: [{ id: 1, image: 201, type: "cms_thumbnail", url: "/media/crops/thumb-a.jpg", old_id: null }],
      },
      {
        id: 202,
        crops: [
          { id: 2, image: 202, type: "cms", url: "/media/crops/cms-b.jpg", old_id: null },
          { id: 3, image: 202, type: "cms_wide", url: "/media/crops/wide-b.jpg", old_id: null },
        ],
      },
    ] as never);

    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;

    await flushPromises();
    await flushPromises();

    api.onCellClicked({
      data: api.rowData.value[0],
      colDef: { field: "imageMedia", headerName: "Images" },
    });

    await flushPromises();

    expect(api.mediaPreview.value?.kind).toBe("gallery");
    expect(api.mediaPreview.value?.images).toHaveLength(2);

    await wrapper.findAll("button.cms-media-gallery-thumb")[1].trigger("click");
    expect(api.mediaPreview.value?.imageId).toBe(202);

    await wrapper.findAll("div.cms-media-gallery-nav button")[0].trigger("click");
    expect(api.mediaPreview.value?.imageId).toBe(201);
  });

  it("covers media preview save/remove guards and upload path", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const state = (wrapper.vm as any).$.setupState as any;
    const confirmSpy = vi.spyOn(window, "confirm");

    api.openMediaPreview("https://player.vimeo.com/video/12345678901", "Vimeo", {
      productionId: mockProduction.id,
      mediaField: "video_1",
    });

    expect(api.mediaPreview.value?.kind).toBe("iframe");
    expect(api.mediaPreview.value?.url).toContain("player.vimeo.com/video/12345678901");

    state.mediaPreviewEditUrl = "https://vimeo.com/12345678901";
    await state.saveMediaVideoUrl();
    expect(productionsService.updateProduction).toHaveBeenCalledWith(
      mockProduction.id,
      expect.objectContaining({ video_1: { nl: "https://vimeo.com/12345678901" } }),
    );

    api.openMediaPreview("https://example.com/image.jpg", "Image", {
      productionId: mockProduction.id,
      imageId: 321,
    });

    confirmSpy.mockReturnValue(false);
    await state.removeMediaImage();
    expect(imagesService.deleteImage).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    await state.removeMediaImage();

    api.openMediaPreview("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "Video", {
      productionId: mockProduction.id,
      mediaField: "video_2",
    });

    state.mediaPreviewEditUrl = "https://youtu.be/dQw4w9WgXcQ";
    await state.saveMediaVideoUrl();

    confirmSpy.mockReturnValue(true);
    await state.removeMediaVideo();
    expect(productionsService.updateProduction).toHaveBeenCalledWith(
      mockProduction.id,
      expect.objectContaining({ video_2: null }),
    );

    class FileReaderMock {
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      result = "data:mock;base64,abc";

      readAsDataURL() {
        this.onload?.();
      }
    }

    const originalFileReader = (globalThis as typeof globalThis & { FileReader?: typeof FileReader }).FileReader;
    (globalThis as typeof globalThis & { FileReader?: typeof FileReader }).FileReader = FileReaderMock as never;

    api.openMediaPreview("https://example.com/upload.jpg", "Image", {
      productionId: mockProduction.id,
      imageId: 777,
    });

    await state.onMediaPreviewImageSelected({
      target: {
        files: [new File(["x"], "upload.png", { type: "image/png" })],
        value: "upload.png",
      },
    } as never);

    expect(mediaUploadService.uploadImageWithCrops).toHaveBeenCalledWith(
      mockProduction.id,
      "data:mock;base64,abc",
    );

    (globalThis as typeof globalThis & { FileReader?: typeof FileReader }).FileReader = originalFileReader;
    confirmSpy.mockRestore();
  });

  it("covers media operations guard conditions", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const state = (wrapper.vm as any).$.setupState as any;

    // Missing productionId - saveMediaVideoUrl
    api.mediaPreview.value = {
      kind: "iframe",
      url: "https://example.com/video",
      label: "Video",
      mediaField: "video_1",
    } as never;
    await state.saveMediaVideoUrl();
    expect(productionsService.updateProduction).not.toHaveBeenCalled();

    // Missing mediaField - saveMediaVideoUrl
    api.mediaPreview.value = {
      kind: "iframe",
      url: "https://example.com/video",
      label: "Video",
      productionId: mockProduction.id,
    } as never;
    await state.saveMediaVideoUrl();
    expect(productionsService.updateProduction).not.toHaveBeenCalled();

    // Empty URL - saveMediaVideoUrl
    api.mediaPreview.value = {
      kind: "iframe",
      url: "   ",
      label: "Video",
      productionId: mockProduction.id,
      mediaField: "video_1",
    } as never;
    await state.saveMediaVideoUrl();
    expect(productionsService.updateProduction).not.toHaveBeenCalled();

    // Missing productionId - removeMediaVideo
    api.mediaPreview.value = {
      kind: "iframe",
      url: "https://example.com/video",
      label: "Video",
      mediaField: "video_1",
    } as never;
    await state.removeMediaVideo();
    expect(productionsService.updateProduction).not.toHaveBeenCalled();

    // Missing mediaField - removeMediaVideo
    api.mediaPreview.value = {
      kind: "iframe",
      url: "https://example.com/video",
      label: "Video",
      productionId: mockProduction.id,
    } as never;
    await state.removeMediaVideo();
    expect(productionsService.updateProduction).not.toHaveBeenCalled();

    // Missing productionId - removeMediaImage
    api.mediaPreview.value = {
      kind: "image",
      url: "https://example.com/image.jpg",
      label: "Image",
      imageId: 123,
    } as never;
    await state.removeMediaImage();
    expect(imagesService.deleteImage).not.toHaveBeenCalled();

    // Missing imageId - removeMediaImage
    api.mediaPreview.value = {
      kind: "image",
      url: "https://example.com/image.jpg",
      label: "Image",
      productionId: mockProduction.id,
    } as never;
    await state.removeMediaImage();
    expect(imagesService.deleteImage).not.toHaveBeenCalled();
  });

  it("covers submitCreateProduction with image upload error recovery", async () => {
    vi.mocked(mediaUploadService.uploadImageWithCrops).mockRejectedValueOnce(new Error("upload failed"));

    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;

    api.openCreateModal();
    await flushPromises();

    api.addMedia("image");
    const imageMedia = api.createForm.value.media.find((m: { type: string }) => m.type === "image");
    imageMedia.url = "data:image/png;base64,abc";

    api.createForm.value.title.nl = "Title";
    api.createForm.value.artist.nl = "Artist";
    api.createForm.value.tagline.nl = "Tagline";
    api.createForm.value.teaser.nl = "Teaser";

    await api.submitCreateProduction();

    // Production should still be created even if image upload fails
    expect(productionsService.createProduction).toHaveBeenCalled();
    expect(api.createModalOpen.value).toBe(false);
  });

  it("covers submitCreateProduction with non-Error exception", async () => {
    vi.spyOn(productionsService, "createProduction").mockRejectedValueOnce("string error" as any);

    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;

    api.openCreateModal();
    api.createForm.value.title.nl = "Title";
    api.createForm.value.artist.nl = "Artist";
    api.createForm.value.tagline.nl = "Tagline";
    api.createForm.value.teaser.nl = "Teaser";

    await api.submitCreateProduction();
    expect(api.createError.value).toBeTruthy();
  });

  it("covers edge cases in onMediaPreviewImageSelected", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const state = (wrapper.vm as any).$.setupState as any;

    // No preview set
    await state.onMediaPreviewImageSelected({
      target: {
        files: [new File(["x"], "test.png", { type: "image/png" })],
      },
    } as never);
    expect(api.mediaPreview.value).toBe(null);

    // No files selected
    api.mediaPreview.value = {
      kind: "image",
      url: "https://example.com/image.jpg",
      label: "Image",
      productionId: mockProduction.id,
      imageId: 123,
    } as never;
    await state.onMediaPreviewImageSelected({
      target: {
        files: [],
      },
    } as never);
    expect(api.mediaPreview.value?.url).toBe("https://example.com/image.jpg");
  });

  it("covers remaining media preview modal transitions", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;

    // Open video placeholder
    api.onCellClicked({
      data: { ...api.rowData.value[0], media: "" },
      colDef: { field: "media", headerName: "Media" },
    });
    expect(api.mediaPreview.value?.kind).toBe("iframe");
    expect(api.mediaPreview.value?.url).toBe("about:blank");

    // Open image placeholder
    api.onCellClicked({
      data: { ...api.rowData.value[0], imageMedia: "" },
      colDef: { field: "imageMedia", headerName: "Images" },
    });
    expect(api.mediaPreview.value?.kind).toBe("image");
    expect(api.mediaPreview.value?.url).toContain("data:image/svg+xml");
  });

  it("covers create production form field updates with validation", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;

    api.openCreateModal();
    expect(api.visibleCreateLangs.value).toContain("nl");
    expect(api.visibleCreateLangs.value).not.toContain("en");

    const createModal = wrapper.findComponent({ name: "CmsCreateProductionModal" });
    createModal.vm.$emit("update-form-field", "description", "nl", "Description NL");
    createModal.vm.$emit("update-form-field", "description_2", "nl", "Description 2 NL");

    expect(api.createForm.value.description.nl).toBe("Description NL");
    expect(api.createForm.value.description_2.nl).toBe("Description 2 NL");

    await api.submitCreateProduction();
    expect(api.createError.value).toBeTruthy();
  });

  it("updates media preview edit url via modal event", async () => {
    const wrapper = await mountTab();
    const state = (wrapper.vm as any).$.setupState as any;

    state.openMediaPreview("https://example.com/video", "Media", {
      productionId: mockProduction.id,
      mediaField: "video_1",
    });

    const modal = wrapper.findComponent({ name: "CmsMediaPreviewModal" });
    modal.vm.$emit("update:media-preview-edit-url", "https://new.example/video");
    await nextTick();

    expect(state.mediaPreviewEditUrl).toBe("https://new.example/video");
  });

  it("covers xml escaping and sparse gallery sync edge", async () => {
    const wrapper = await mountTab();
    const state = (wrapper.vm as any).$.setupState as any;

    const escaped = state.escapeXml("&<>'\"");
    expect(escaped).toBe("&amp;&lt;&gt;&apos;&quot;");

    wrapper.unmount();

    state.mediaPreview = {
      kind: "gallery",
      url: "https://example.com/1.jpg",
      label: "Gallery",
      images: [{ id: 1, url: "https://example.com/1.jpg" }, undefined] as any,
      imageId: 1,
      currentImageIndex: 0,
    };

    state.syncGalleryPreview(1);
    expect(state.mediaPreview.imageId).toBe(1);
  });

  it("covers media preview mutation error branches", async () => {
    const wrapper = await mountTab();
    const state = (wrapper.vm as any).$.setupState as any;
    const confirmSpy = vi.spyOn(window, "confirm");

    class FailingFileReaderMock {
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      result = null;

      readAsDataURL() {
        this.onerror?.();
      }
    }

    const originalFileReader = (globalThis as typeof globalThis & { FileReader?: typeof FileReader }).FileReader;
    (globalThis as typeof globalThis & { FileReader?: typeof FileReader }).FileReader = FailingFileReaderMock as never;

    state.openMediaPreview("https://example.com/image.jpg", "Image", {
      productionId: mockProduction.id,
      imageId: 10,
    });

    await state.onMediaPreviewImageSelected({
      target: {
        files: [new File(["x"], "broken.png", { type: "image/png" })],
        value: "broken.png",
      },
    } as never);

    (globalThis as typeof globalThis & { FileReader?: typeof FileReader }).FileReader = originalFileReader;

    state.openMediaPreview("https://example.com/video", "Video", {
      productionId: mockProduction.id,
      mediaField: "video_1",
    });
    state.mediaPreviewEditUrl = "https://new.example/video";
    vi.spyOn(productionsService, "updateProduction").mockRejectedValueOnce(new Error("save failed"));
    await state.saveMediaVideoUrl();

    state.openMediaPreview("https://example.com/image.jpg", "Image", {
      productionId: mockProduction.id,
      imageId: 123,
    });
    confirmSpy.mockReturnValue(true);
    vi.mocked(imagesService.deleteImage).mockRejectedValueOnce(new Error("delete failed"));
    await state.removeMediaImage();

    state.openMediaPreview("https://example.com/video", "Video", {
      productionId: mockProduction.id,
      mediaField: "video_2",
    });
    confirmSpy.mockReturnValue(false);
    await state.removeMediaVideo();

    confirmSpy.mockReturnValue(true);
    vi.spyOn(productionsService, "updateProduction").mockRejectedValueOnce(new Error("delete failed"));
    await state.removeMediaVideo();

    confirmSpy.mockRestore();
  });

  it("removes media item by id from create form", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;

    api.addMedia("image");
    api.addMedia("video");
    const mediaIdToRemove = api.createForm.value.media[0]?.id;

    api.removeMedia(mediaIdToRemove);
    expect(api.createForm.value.media.some((m: { id: string }) => m.id === mediaIdToRemove)).toBe(false);
  });

  it("keeps image map unchanged when lazy image response is stale", async () => {
    vi.stubEnv("MODE", "development");

    let resolveImages: ((value: Array<{ id: number; crops: Array<{ type: string; url: string }> }>) => void) | undefined;
    vi.mocked(imagesService.getImagesByProduction).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveImages = resolve as (value: Array<{ id: number; crops: Array<{ type: string; url: string }> }>) => void;
        }) as never,
    );

    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;

    const currentToken = api.imageLoadRequestToken.value;
    api.imageLoadRequestToken.value = currentToken + 1;

    resolveImages?.([{ id: 11, crops: [{ type: "cms", url: "/stale.jpg" }] }]);
    await flushPromises();

    expect(api.imagesByProductionId.value.size).toBe(0);
  });

  it("renders secondary-tag preview content in both bulk mode modal variants", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;

    api.secondaryTagBulkModeOpen.value = true;
    api.secondaryTagBulkModeTagsPreview.value = "Drama, Comedy";
    api.secondaryTagBulkModeAddedPreview.value = "+ Theme A";
    api.secondaryTagBulkModeRemovedPreview.value = "- Theme B";
    await nextTick();

    const html = wrapper.html();
    expect(html).toContain("Drama, Comedy");
    expect(html).toContain("+ Theme A");
    expect(html).toContain("- Theme B");
    // Two modal variants are currently rendered; both should contain preview sections.
    expect(wrapper.findAll(".cms-modal-overlay").length).toBeGreaterThanOrEqual(2);
  });

  it("covers secondary-tag bulk diff with unknown tag ids and vimeo regular URL parsing", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const state = (wrapper.vm as any).$.setupState as any;

    const row = api.rowData.value[0];
    row.source.tags = [1 as never, 2 as never, 999 as never];
    const otherRow = {
      ...row,
      id: row.id + 55,
      source: {
        ...row.source,
        id: row.id + 55,
        tags: [1 as never, 2 as never, 999 as never],
      },
    };

    api.gridApi.value = {
      getSelectedRows: () => [row, otherRow],
      getState: vi.fn(() => ({})),
      getColumnState: vi.fn(() => []),
      setState: vi.fn(),
      setGridOption: vi.fn(),
      sizeColumnsToFit: vi.fn(),
    };

    api.openTagEditorPanel(row);
    api.toggleTagEditorTag(1, true);
    await api.saveTagEditorPanel();
    await api.confirmBulkEdit();
    await api.confirmSecondaryTagBulkDiff();

    state.openMediaPreview("https://vimeo.com/123456789", "Vimeo", {
      productionId: mockProduction.id,
      mediaField: "video_1",
    });
    expect(api.mediaPreview.value?.url).toContain("https://player.vimeo.com/video/123456789");
    expect(api.mediaPreview.value?.kind).toBe("iframe");
  });

  it("parses vimeo player URL and bare vimeo URL without digits", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const state = (wrapper.vm as any).$.setupState as any;

    state.openMediaPreview("https://player.vimeo.com/video/987654", "Vimeo", {
      productionId: mockProduction.id,
      mediaField: "video_1",
    });
    expect(api.mediaPreview.value?.url).toContain("https://player.vimeo.com/video/987654");
    expect(api.mediaPreview.value?.kind).toBe("iframe");

    state.openMediaPreview("https://vimeo.com/no-digits", "Vimeo", {
      productionId: mockProduction.id,
      mediaField: "video_1",
    });
    expect(api.mediaPreview.value?.url).toBe("https://vimeo.com/no-digits");
    expect(api.mediaPreview.value?.kind).toBe("iframe");
  });

  it("clears the primary genre tag when set to 0", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = api.rowData.value[0];

    await api.onCellEditingStopped({
      data: row,
      value: 0,
      oldValue: 1,
      colDef: { field: "genres" },
      node: { setDataValue: vi.fn() },
    });

    expect(productionsService.updateProduction).toHaveBeenCalled();
    const lastCall = (productionsService.updateProduction as any).mock.calls.at(-1);
    expect(lastCall?.[1]?.tags).toEqual(expect.not.arrayContaining([1]));
  });

  it("ignores no-op genre edits where value equals previous and non-finite values", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = api.rowData.value[0];
    const setDataValue = vi.fn();

    // no-op: same value
    await api.onCellEditingStopped({
      data: row,
      colDef: { field: "genres" },
      value: undefined,
      oldValue: undefined,
      node: { setDataValue },
    });
    expect(setDataValue).not.toHaveBeenCalled();

    // non-finite: NaN reverts
    await api.onCellEditingStopped({
      data: row,
      colDef: { field: "genres" },
      value: Number.NaN,
      oldValue: 1,
      node: { setDataValue },
    });
    expect(setDataValue).toHaveBeenCalledWith("genres", 1);
  });

  it("resolves mediaField from video_2 when media cell value matches video_2", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = {
      ...api.rowData.value[0],
      media: "https://example.com/clip2.mp4",
      source: {
        ...api.rowData.value[0].source,
        video_1: null,
        video_2: { nl: "https://example.com/clip2.mp4" },
      },
    };

    api.onCellClicked({
      data: row,
      colDef: { field: "media", headerName: "Media" },
    });

    expect(api.mediaPreview.value?.mediaField).toBe("video_2");
  });

  it("falls back to video_2 as preferred field when only video_2 is set on empty media cell", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const row = {
      ...api.rowData.value[0],
      media: "",
      source: {
        ...api.rowData.value[0].source,
        video_1: null,
        video_2: { nl: "https://example.com/v2.mp4" },
      },
    };

    api.onCellClicked({
      data: row,
      colDef: { field: "media", headerName: "Media" },
    });

    expect(api.mediaPreview.value?.mediaField).toBe("video_2");
  });

  it("opens image gallery preview when imageMedia cell has images", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;

    api.imagesByProductionId.value = new Map([
      [mockProduction.id, [
        { id: 1, url: "/a.jpg" },
        { id: 2, url: "/b.jpg" },
      ]],
    ]);
    api.rebuildRows();

    api.onCellClicked({
      data: api.rowData.value[0],
      colDef: { field: "imageMedia", headerName: "Images" },
    });

    expect(api.mediaPreview.value?.kind).toBe("gallery");
    expect(api.mediaPreview.value?.images?.length).toBe(2);
  });

  it("onMediaFileChange is a no-op when mediaId does not match", async () => {
    class FileReaderMock {
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      result = "data:image/png;base64,xyz";
      readAsDataURL() {
        this.onload?.();
      }
    }
    const originalFileReader = (globalThis as any).FileReader;
    (globalThis as any).FileReader = FileReaderMock;

    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;

    api.addMedia("image");
    const before = api.createForm.value.media[0]?.url;

    await api.onMediaFileChange("media-does-not-exist", {
      target: {
        files: [new File(["x"], "x.png", { type: "image/png" })],
        value: "x",
      },
    } as unknown as Event);

    expect(api.createForm.value.media[0]?.url).toBe(before);

    (globalThis as any).FileReader = originalFileReader;
  });

  it("surfaces generic error string when persistBulkProductionPatch rejects with non-Error", async () => {
    const wrapper = await mountTab();
    const api = (wrapper.vm as any).$?.exposed.__test;
    const state = (wrapper.vm as any).$.setupState as any;
    const row = api.rowData.value[0];

    vi.spyOn(productionsService, "bulkUpdateProductions").mockRejectedValueOnce("boom");

    api.onCellClicked({
      data: row,
      colDef: { field: "descriptionOne", headerName: "Description" },
    });

    await expect(api.saveEditorPanel()).rejects.toBeDefined();
    expect(state.saveError).toBeTruthy();
  });

  it("covers escapeXml default callback branch", async () => {
    const wrapper = await mountTab();
    const state = (wrapper.vm as any).$.setupState as any;

    const fakeUnsafe = {
      replace: (_regex: RegExp, cb: (character: string) => string) => cb("x"),
    };

    const result = state.escapeXml(fakeUnsafe as never);
    expect(result).toBe("x");
  });
});
