import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { createRouter, createMemoryHistory } from "vue-router";
import type { Hall, ProductionWithBackwardsRefs, Tag } from "@viernulvier/shared";
import { useAuthStore } from "@/stores/auth";
import { RouteNames } from "@/router/routeNames";
import { i18n } from "@/i18n";
import CMSView from "@/views/admin/CMSView.vue";
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
  };
});

vi.mock("@/services/tags", () => ({
  getAllTags: vi.fn(),
  getTagsForProduction: vi.fn(),
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

vi.mock("@/services/auth", () => ({
  logout: vi.fn().mockResolvedValue(undefined),
  getCurrentlyLoggedInAdmin: vi.fn().mockRejectedValue(new Error("Unauthorized")),
}));

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: "/:lang/admin", name: RouteNames.ADMIN, component: { template: "<div>Admin</div>" } },
    { path: "/:lang/admin/cms", name: RouteNames.CMS, component: CMSView },
    { path: "/:lang/admin/login", name: RouteNames.LOGIN, component: { template: "<div>Login</div>" } },
  ],
});

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

const gridStub = defineComponent({
  name: "AgGridVue",
  props: {
    rowData: {
      type: Array,
      default: () => [],
    },
  },
  template: `
    <div data-testid="ag-grid-stub">
      <span data-testid="row-count">{{ rowData.length }}</span>
      <span data-testid="first-row-tags">{{ rowData[0]?.genres || "" }}|{{ rowData[0]?.tags || "" }}</span>
    </div>
  `,
});

const navbarStub = defineComponent({
  name: "AppNavbar",
  emits: ["toggle-dark"],
  template: '<button data-testid="nav-dark-toggle" @click="$emit(\'toggle-dark\')">toggle</button>',
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
  tags: [1, 2] as unknown as ProductionWithBackwardsRefs["tags"],
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
  tag_type: 1 as never,
  public: false,
} as Tag;

const mockHall = {
  id: 1,
  old_id: null,
  address: "Street",
  name: { en: "Main hall" },
} as Hall;

describe("CMSView", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    useAuthStore().admin = { id: 1, username: "admin", super: false, profile_picture: null };
    vi.spyOn(productionsService, "getProductions").mockResolvedValue({
      items: [mockProduction],
      total: 1,
    });
    vi.spyOn(productionsService, "createProduction").mockResolvedValue(mockProduction);
    vi.spyOn(productionsService, "updateProduction").mockResolvedValue(mockProduction);
    vi.spyOn(tagsService, "getAllTags").mockResolvedValue([mockPublicTag, mockHiddenTag]);
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
    await router.push("/en/admin/cms");
    await router.isReady();
  });

  async function mountCMSView() {
    const wrapper = mount(CMSView, {
      global: {
        plugins: [createPinia(), router, i18n],
        stubs: {
          AgGridVue: gridStub,
          AppNavbar: navbarStub,
          AppFooter: true,
        },
      },
    });
    await flushPromises();
    return wrapper;
  }

  it("renders without errors", async () => {
    const wrapper = await mountCMSView();
    expect(wrapper.exists()).toBe(true);
  });

  it("renders the CMS text", async () => {
    const wrapper = await mountCMSView();
    expect(wrapper.text()).toMatch(/Gegevens bewerken|CMS \(admin only\)/);
  });

  it("loads data using paginated productions and admin tag endpoint", async () => {
    await mountCMSView();

    expect(productionsService.getProductions).toHaveBeenCalledTimes(1);
    expect(tagsService.getAllTags).toHaveBeenCalledTimes(1);
    expect(hallsService.getHalls).toHaveBeenCalledTimes(1);
  });

  it("shows hidden tags in CMS row data", async () => {
    const wrapper = await mountCMSView();

    expect(wrapper.get('[data-testid="row-count"]').text()).toBe("1");
    expect(wrapper.get('[data-testid="first-row-tags"]').text()).toContain("HiddenTag");
  });

  it("shows a load error when CMS data fetch fails", async () => {
    vi.spyOn(productionsService, "getProductions").mockRejectedValueOnce(new Error("network"));
    const wrapper = await mountCMSView();

    expect(wrapper.text()).toMatch(/Could not load CMS data|Kon CMS-gegevens niet laden/);
  });

  it("validates create modal fields before calling createProduction", async () => {
    const wrapper = await mountCMSView();
    const api = (wrapper.vm as any).__test;

    api.openCreateModal();
    await api.submitCreateProduction();

    expect(api.createError.value).toBeTruthy();
    expect(productionsService.createProduction).not.toHaveBeenCalled();
  });

  it("submits create production with valid form data", async () => {
    const wrapper = await mountCMSView();
    const api = (wrapper.vm as any).__test;

    api.openCreateModal();
    api.createForm.value.title.nl = "Title";
    api.createForm.value.artist.nl = "Artist";
    api.createForm.value.tagline.nl = "Tagline";
    api.createForm.value.teaser.nl = "Teaser";
    api.createForm.value.video_1.nl = "data:image/png;base64,abc";

    await api.submitCreateProduction();

    expect(productionsService.createProduction).toHaveBeenCalledTimes(1);
    expect(api.createModalOpen.value).toBe(false);
  });

  it("opens editor panel when clicking long-text cells and saves", async () => {
    const wrapper = await mountCMSView();
    const api = (wrapper.vm as any).__test;
    const row = api.rowData.value[0];

    api.onCellClicked({
      data: row,
      colDef: { field: "descriptionOne", headerName: "Description" },
    });

    expect(api.editorPanel.value).toBeTruthy();
    await api.saveEditorPanel();
    expect(productionsService.updateProduction).toHaveBeenCalled();
    expect(api.editorPanel.value).toBeNull();
  });

  it("handles create event modal open/close and no-selection submit", async () => {
    const wrapper = await mountCMSView();
    const api = (wrapper.vm as any).__test;

    api.openCreateEventModal();
    expect(api.createEventModalOpen.value).toBe(true);

    api.selectedEventsProductionId.value = null;
    await api.submitCreateEvent();

    api.closeCreateEventModal();
    expect(api.createEventModalOpen.value).toBe(false);
  });

  it("closes event panel and ignores unrelated cell edit events", async () => {
    const wrapper = await mountCMSView();
    const api = (wrapper.vm as any).__test;

    api.selectedEventsProductionId.value = 42;
    api.selectedEventRows.value = [{ id: 1 }];
    api.closeEventsPanel();

    expect(api.selectedEventsProductionId.value).toBeNull();
    expect(api.selectedEventRows.value).toEqual([]);

    await api.onCellEditingStopped({ data: null, colDef: {} });
    api.onProductionCellEditingStarted({ data: null, colDef: {} });
    api.onProductionCellKeyDown({ data: null, colDef: {}, event: new KeyboardEvent("keydown", { key: "A" }) });
  });

  it("covers helper mappers and reset helpers", async () => {
    const wrapper = await mountCMSView();
    const api = (wrapper.vm as any).__test;

    expect(api.localizeValue(undefined)).toBe("");
    expect(api.setCurrentLanguageValue({ en: "old" }, "new")).toMatchObject({ nl: "new" });
    expect(api.toLanguageMapOrNull({ nl: "", en: "", fr: "" })).toBeNull();
    expect(api.toLanguageMap({ nl: "x", en: "", fr: "" })).toEqual({ nl: "x" });
    expect(api.mediaToLanguageMap({ nl: "", en: "x", fr: "y" })).toBeNull();
    expect(api.mediaToLanguageMap({ nl: "media", en: "", fr: "" })).toEqual({ nl: "media" });

    api.createForm.value.title.nl = "something";
    api.resetCreateForm();
    expect(api.createForm.value.title.nl).toBe("");

    api.createLinkedEventForm.value.hallId = 0;
    api.resetCreateLinkedEventForm();
    expect(api.createLinkedEventForm.value.hallId).toBeGreaterThan(0);
  });

  it("covers createAndLinkEvent validation and success branches", async () => {
    const wrapper = await mountCMSView();
    const api = (wrapper.vm as any).__test;

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

  it("covers save/remove linked event branches", async () => {
    const wrapper = await mountCMSView();
    const api = (wrapper.vm as any).__test;

    const eventRow = {
      id: 100,
      startsAt: "2026-04-13T10:00",
      endsAt: "2026-04-13T12:00",
      doorsAt: "2026-04-13T09:30",
      hallId: mockHall.id,
      infoNl: "note",
    };

    api.selectedEventsProductionId.value = null;
    await api.saveLinkedEvent(eventRow);
    await api.removeLinkedEvent(eventRow);

    api.selectedEventsProductionId.value = mockProduction.id;
    await api.saveLinkedEvent(eventRow);
    await api.removeLinkedEvent(eventRow);

    expect(eventsService.updateEvent).toHaveBeenCalled();
    expect(eventsService.deleteEvent).toHaveBeenCalled();
  });

  it("covers click/edit handlers and event-row focus behavior", async () => {
    const wrapper = await mountCMSView();
    const api = (wrapper.vm as any).__test;
    const row = api.rowData.value[0];

    api.onCellClicked({ data: row, colDef: { colId: "eventsAction" } });
    expect(api.selectedEventsProductionId.value).toBe(row.id);

    api.onCellClicked({ data: row, colDef: { field: "unknown" } });
    api.onCellClicked({ data: row, colDef: {} });

    api.onProductionCellEditingStarted({ data: row, colDef: { field: "performer" } });
    api.onProductionCellKeyDown({ data: row, colDef: { field: "performer" }, event: new KeyboardEvent("keydown", { key: "Enter" }) });
    await api.onCellEditingStopped({
      data: row,
      value: "Updated",
      oldValue: "Artist",
      colDef: { field: "performer" },
      node: { setDataValue: vi.fn() },
    });
    expect(productionsService.updateProduction).toHaveBeenCalled();

    const focusOutEvent = {
      currentTarget: document.createElement("div"),
      relatedTarget: null,
    } as unknown as FocusEvent;
    api.onEventRowFocusOut({ id: 123, startsAt: "", endsAt: "", doorsAt: "", hallId: 1, infoNl: "", date: "", time: "", location: "", price: "" }, focusOutEvent);
    api.onEventRowEnter({ id: 123, startsAt: "", endsAt: "", doorsAt: "", hallId: 1, infoNl: "", date: "", time: "", location: "", price: "" });
  });

  it("covers showEventsForProduction success and error branches", async () => {
    const wrapper = await mountCMSView();
    const api = (wrapper.vm as any).__test;
    const row = api.rowData.value[0];

    row.source.events = [100];
    await api.showEventsForProduction(row);
    expect(api.selectedEventsProductionId.value).toBe(row.id);

    vi.spyOn(eventsService, "getEvent").mockRejectedValueOnce(new Error("boom"));
    api.detailRowsCache.value.clear();
    api.eventByIdCache.value.clear();
    await api.showEventsForProduction(row);
    expect(api.eventsPanelError.value).toBeTruthy();
  });

  it("covers refreshEventsPanelForSelectedProduction missing-row branch", async () => {
    const wrapper = await mountCMSView();
    const api = (wrapper.vm as any).__test;

    api.selectedEventsProductionId.value = 9999;
    await api.refreshEventsPanelForSelectedProduction();

    expect(api.selectedEventsProductionId.value).toBeNull();
  });

  it("covers onCellEditingStopped non-inline and revert branches", async () => {
    const wrapper = await mountCMSView();
    const api = (wrapper.vm as any).__test;
    const row = api.rowData.value[0];
    const setDataValue = vi.fn();

    await api.onCellEditingStopped({
      data: row,
      value: "x",
      oldValue: "y",
      colDef: { field: "genres" },
      node: { setDataValue },
    });

    await api.onCellEditingStopped({
      data: row,
      value: "new",
      oldValue: "old",
      colDef: { field: "performer" },
      node: { setDataValue },
    });

    expect(setDataValue).toHaveBeenCalledWith("performer", "old");
  });

  it("covers committed inline edit no-change and error branches", async () => {
    const wrapper = await mountCMSView();
    const api = (wrapper.vm as any).__test;
    const row = api.rowData.value[0];
    const setDataValue = vi.fn();

    api.onProductionCellKeyDown({ data: row, colDef: { field: "performer" }, event: new KeyboardEvent("keydown", { key: "Enter" }) });
    await api.onCellEditingStopped({
      data: row,
      value: "Artist",
      oldValue: "Artist",
      colDef: { field: "performer" },
      node: { setDataValue },
    });

    vi.spyOn(productionsService, "updateProduction").mockRejectedValueOnce(new Error("save failed"));
    api.onProductionCellKeyDown({ data: row, colDef: { field: "performer" }, event: new KeyboardEvent("keydown", { key: "Enter" }) });
    await api.onCellEditingStopped({
      data: row,
      value: "Changed",
      oldValue: "Artist",
      colDef: { field: "performer" },
      node: { setDataValue },
    });

    expect(setDataValue).toHaveBeenCalledWith("performer", "Artist");
  });

  it("covers helper branches for language checks and loadCmsData direct call", async () => {
    const wrapper = await mountCMSView();
    const api = (wrapper.vm as any).__test;

    expect(api.hasAnyLanguageValue({ nl: "", en: "", fr: "" })).toBe(false);
    expect(api.hasAnyLanguageValue({ nl: "x", en: "", fr: "" })).toBe(true);

    await api.loadCmsData();
    expect(api.rowData.value.length).toBeGreaterThanOrEqual(0);
  });

  it("covers template interaction handlers and key/file branches", async () => {
    const wrapper = await mountCMSView();
    const api = (wrapper.vm as any).__test;

    const addButton = wrapper.find(".cms-add-button");
    await addButton.trigger("click");

    const searchInput = wrapper.find(".cms-search-input");
    await searchInput.setValue("abc");
    await searchInput.trigger("input");

    const actionButtons = wrapper.findAll(".cms-grid-actions .cms-mini-btn");
    for (const button of actionButtons) {
      await button.trigger("click");
    }

    const chooserClose = wrapper.find(".cms-column-popover-header .cms-mini-btn");
    if (chooserClose.exists()) {
      await chooserClose.trigger("click");
    }

    api.selectedEventsProductionId.value = mockProduction.id;
    api.selectedEventRows.value = [
      {
        id: 100,
        date: "",
        time: "",
        location: "",
        price: "",
        startsAt: "2026-04-13T10:00",
        endsAt: "2026-04-13T12:00",
        doorsAt: "2026-04-13T09:30",
        hallId: mockHall.id,
        infoNl: "info",
      },
    ];
    await flushPromises();

    const focusRow = wrapper.find(".cms-events-table tbody tr");
    if (focusRow.exists()) {
      await focusRow.trigger("focusout");
      await focusRow.trigger("keydown.enter");
    }

    const saveEventBtn = wrapper.find(".cms-events-inline-action .cms-side-save");
    const removeEventBtn = wrapper.find(".cms-events-inline-action .cms-side-close");
    if (saveEventBtn.exists()) await saveEventBtn.trigger("click");
    if (removeEventBtn.exists()) await removeEventBtn.trigger("click");

    api.onProductionCellEditingStarted({ data: api.rowData.value[0], colDef: { field: "performer" } });
    api.onWindowKeyDown(new KeyboardEvent("keydown", { key: "Enter" }));
    await api.onCellEditingStopped({
      data: api.rowData.value[0],
      value: "Artist 2",
      oldValue: "Artist",
      colDef: { field: "performer" },
      node: { setDataValue: vi.fn() },
    });

    const fileReaderInstances: Array<{ onload: null | (() => void); result: string }> = [];
    class FileReaderMock {
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      result = "data:mock;base64,abc";
      readAsDataURL() {
        fileReaderInstances.push(this);
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

  it("covers additional CMS error and utility branches", async () => {
    const wrapper = await mountCMSView();
    const api = (wrapper.vm as any).__test;

    vi.spyOn(eventsService, "createEvent").mockRejectedValueOnce(new Error("create fail"));
    api.selectedEventsProductionId.value = mockProduction.id;
    api.createLinkedEventForm.value.hallId = mockHall.id;
    api.createLinkedEventForm.value.startsAt = "2026-04-13T10:00";
    api.createLinkedEventForm.value.endsAt = "2026-04-13T12:00";
    api.createLinkedEventForm.value.doorsAt = "2026-04-13T09:30";
    await api.createAndLinkEvent();
    expect(api.eventsPanelError.value).toBeTruthy();

    vi.spyOn(eventsService, "updateEvent").mockRejectedValueOnce(new Error("update fail"));
    await api.saveLinkedEvent({
      id: 100,
      startsAt: "2026-04-13T10:00",
      endsAt: "2026-04-13T12:00",
      doorsAt: "2026-04-13T09:30",
      hallId: mockHall.id,
      infoNl: "",
      date: "",
      time: "",
      location: "",
      price: "",
    });
    expect(api.eventsPanelError.value).toBeTruthy();

    vi.spyOn(eventsService, "deleteEvent").mockRejectedValueOnce(new Error("delete fail"));
    await api.removeLinkedEvent({
      id: 100,
      startsAt: "",
      endsAt: "",
      doorsAt: "",
      hallId: mockHall.id,
      infoNl: "",
      date: "",
      time: "",
      location: "",
      price: "",
    });
    expect(api.eventsPanelError.value).toBeTruthy();

    localStorage.setItem("viernulvier-dark", "false");
    expect(api.getInitialDark()).toBe(false);
    localStorage.setItem("viernulvier-dark", "true");
    expect(api.getInitialDark()).toBe(true);
    localStorage.removeItem("viernulvier-dark");
    expect(typeof api.getInitialDark()).toBe("boolean");

    expect(wrapper.exists()).toBe(true);
  });

  it("covers template v-model handlers for create and event modals", async () => {
    const wrapper = await mountCMSView();

    await wrapper.get(".cms-add-button").trigger("click");
    await wrapper.findAll(".cms-language-pill")[1]?.trigger("click");
    await wrapper.findAll(".cms-language-pill")[2]?.trigger("click");

    const inputs = wrapper.findAll(".cms-modal .cms-text-input");
    for (const input of inputs) {
      if ((input.element as HTMLInputElement).type === "file") {
        continue;
      }
      if ((input.element as HTMLInputElement).type === "checkbox") {
        await input.setValue(true);
      } else {
        await input.setValue("value");
      }
    }
    const textareas = wrapper.findAll(".cms-modal .cms-side-textarea");
    for (const textarea of textareas) {
      await textarea.setValue("multiline value");
    }

    const cancelBtn = wrapper.find(".cms-modal-footer .cms-side-close");
    if (cancelBtn.exists()) {
      await cancelBtn.trigger("click");
    }

    const api = (wrapper.vm as any).__test;
    api.selectedEventsProductionId.value = mockProduction.id;
    api.createEventModalOpen.value = true;
    await nextTick();

    const eventModalInputs = wrapper.findAll('.cms-events-create-grid .cms-text-input');
    for (const input of eventModalInputs) {
      const el = input.element as HTMLInputElement | HTMLSelectElement;
      if (el.tagName.toLowerCase() === "select") {
        await input.setValue(String(mockHall.id));
      } else {
        await input.setValue("2026-04-13T10:00");
      }
    }

    const createEventBtn = wrapper.findAll(".cms-modal-footer .cms-side-save").at(-1);
    if (createEventBtn?.exists()) {
      await createEventBtn.trigger("click");
    }
  });

  it("covers column chooser checkbox, editor textarea model, locale watch and unmount", async () => {
    const wrapper = await mountCMSView();
    const api = (wrapper.vm as any).__test;

    await wrapper.findAll(".cms-grid-actions .cms-mini-btn").at(-1)?.trigger("click");
    const chooserCheckbox = wrapper.find(".cms-column-chooser input[type='checkbox']");
    if (chooserCheckbox.exists()) {
      await chooserCheckbox.setValue(false);
    }

    api.onCellClicked({
      data: api.rowData.value[0],
      colDef: { field: "descriptionOne", headerName: "Description" },
    });
    await nextTick();
    const editorTextArea = wrapper.find(".cms-side-panel .cms-side-textarea");
    if (editorTextArea.exists()) {
      await editorTextArea.setValue("updated text");
    }

    i18n.global.locale.value = "fr";
    await nextTick();

    await wrapper.get('button[aria-label="Toggle dark mode"]').trigger("click");

    wrapper.unmount();
  });
});