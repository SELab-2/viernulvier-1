import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { ref } from "vue";
import CmsTagTypesTab from "@/components/admin/cms/tagTypes/CmsTagTypesTab.vue";
import * as tags from "@/services/tags";
import { i18n } from "@/i18n";

// -------------------------
// mocks
// -------------------------

vi.mock("ag-grid-vue3", () => ({
  AgGridVue: {
    template: "<div class='ag-grid-mock' />",
  },
}));

vi.mock("@/composables/useDarkMode", () => ({
  useDarkMode: () => ({
    isDark: ref(false),
  }),
}));

vi.mock("@/composables/useCmsTagTypeGrid", () => ({
  useCmsTagTypeGrid: () => ({
    agThemeVars: {},
    autoSizeGridColumns: vi.fn(),
    columnChooserOpen: ref(false),
    columnDefs: [],
    columnVisibility: {},
    defaultColDef: {},
    exportGridCsv: vi.fn(),
    fitGridColumns: vi.fn(),
    gridColumnOptions: [],
    onGridReady: vi.fn(),
    onSelectionChanged: vi.fn(),
    quickFilterText: ref(""),
    resetGridFilters: vi.fn(),
    resetGridState: vi.fn(),
    rowSelection: "multiple",
    selectionColumnDef: {},
    selectedCount: ref(0),
    setGridColumnVisibility: vi.fn(),
    applyQuickFilter: vi.fn(),
    persistGridState: vi.fn(),
    gridApi: ref(null),
  }),
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

// -------------------------
// helpers
// -------------------------

function mountTab() {
  return mount(CmsTagTypesTab, {
    global: {
      plugins: [i18n],
    },
  });
}

const mockTagType = {
  id: 1,
  name: { nl: "Genre", en: "Genre", fr: "Genre" },
} as any;

const mockTag = {
  id: 10,
  name: { nl: "Drama" },
  tag_type: 1,
  public: true,
} as any;

function mockLoad(tagTypes = [mockTagType], tagList = [mockTag]) {
  vi.spyOn(tags, "getTagTypes").mockResolvedValue(tagTypes);
  vi.spyOn(tags, "getAllTags").mockResolvedValue(tagList);
}

// -------------------------
// tests
// -------------------------

describe("CmsTagTypesTab", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("loading", () => {
    it("loads tag types and tags on mount", async () => {
      const typesSpy = vi.spyOn(tags, "getTagTypes").mockResolvedValue([mockTagType]);
      const tagsSpy = vi.spyOn(tags, "getAllTags").mockResolvedValue([mockTag]);

      const wrapper = mountTab();
      await flushPromises();

      expect(typesSpy).toHaveBeenCalledOnce();
      expect(tagsSpy).toHaveBeenCalledOnce();
      expect(wrapper.vm.__test.isLoading.value).toBe(false);
      expect(wrapper.vm.__test.rowData.value.length).toBe(1);
    });

    it("handles load error from getTagTypes", async () => {
      vi.spyOn(tags, "getTagTypes").mockRejectedValue(new Error("network fail"));
      vi.spyOn(tags, "getAllTags").mockResolvedValue([]);

      const wrapper = mountTab();
      await flushPromises();

      expect(wrapper.vm.__test.loadError.value).toBeTruthy();
      expect(wrapper.vm.__test.rowData.value.length).toBe(0);
    });

    it("handles generic (non-Error) load failure", async () => {
      vi.spyOn(tags, "getTagTypes").mockRejectedValue("boom");
      vi.spyOn(tags, "getAllTags").mockResolvedValue([]);

      const wrapper = mountTab();
      await flushPromises();

      expect(wrapper.vm.__test.loadError.value).toBeTruthy();
    });

    it("builds rows correctly from loaded data", async () => {
      mockLoad();

      const wrapper = mountTab();
      await flushPromises();

      const row = wrapper.vm.__test.rowData.value[0];
      expect(row.id).toBe(1);
      expect(row.tagCount).toBe(1);
      expect(row.tags).toEqual([10]);
    });
  });

  describe("locale watch", () => {
    it("rebuilds rows when locale changes", async () => {
      mockLoad(
        [{ id: 1, name: { nl: "Genre", en: "Category" } }],
        [],
      );

      const wrapper = mountTab();
      await flushPromises();

      const initialName = wrapper.vm.__test.rowData.value[0].name;

      (i18n.global.locale as any).value = "en";
      await wrapper.vm.$nextTick();

      const updatedName = wrapper.vm.__test.rowData.value[0].name;
      expect(initialName).not.toBe(updatedName);
    });
  });

  describe("editor panel (name field)", () => {
    async function mountWithType() {
      mockLoad();
      const wrapper = mountTab();
      await flushPromises();
      return wrapper;
    }

    it("is closed by default", async () => {
      const wrapper = await mountWithType();
      expect(wrapper.vm.__test.editorPanel.value).toBeNull();
    });

    it("opens when name cell is clicked", async () => {
      const wrapper = await mountWithType();
      const row = wrapper.vm.__test.rowData.value[0];

      wrapper.vm.__test.onCellClicked({
        data: row,
        colDef: { field: "name", headerName: "Name" },
      } as any);

      expect(wrapper.vm.__test.editorPanel.value).not.toBeNull();
      expect(wrapper.vm.__test.editorPanel.value?.rowId).toBe(row.id);
      expect(wrapper.vm.__test.editorPanel.value?.apiField).toBe("name");
    });

    it("pre-fills values from source tag type", async () => {
      const wrapper = await mountWithType();
      const row = wrapper.vm.__test.rowData.value[0];

      wrapper.vm.__test.onCellClicked({
        data: row,
        colDef: { field: "name", headerName: "Name" },
      } as any);

      const values = wrapper.vm.__test.editorPanel.value?.values;
      expect(values?.nl).toBe("Genre");
      expect(values?.en).toBe("Genre");
    });

    it("clears saveError when panel opens", async () => {
      const wrapper = await mountWithType();
      const row = wrapper.vm.__test.rowData.value[0];

      wrapper.vm.__test.saveError.value = "old error";
      wrapper.vm.__test.onCellClicked({
        data: row,
        colDef: { field: "name", headerName: "Name" },
      } as any);

      expect(wrapper.vm.__test.saveError.value).toBeNull();
    });

    it("closes the panel and clears saveError", async () => {
      const wrapper = await mountWithType();
      const row = wrapper.vm.__test.rowData.value[0];

      wrapper.vm.__test.onCellClicked({
        data: row,
        colDef: { field: "name", headerName: "Name" },
      } as any);
      wrapper.vm.__test.saveError.value = "some error";

      wrapper.vm.__test.closeEditorPanel();

      expect(wrapper.vm.__test.editorPanel.value).toBeNull();
      expect(wrapper.vm.__test.saveError.value).toBeNull();
    });

    it("ignores clicks on non-panel columns", async () => {
      const wrapper = await mountWithType();
      const row = wrapper.vm.__test.rowData.value[0];

      wrapper.vm.__test.onCellClicked({
        data: row,
        colDef: { field: "tagCount" },
      } as any);

      expect(wrapper.vm.__test.editorPanel.value).toBeNull();
    });

    it("ignores clicks with no data or no field", async () => {
      const wrapper = await mountWithType();
      const row = wrapper.vm.__test.rowData.value[0];

      wrapper.vm.__test.onCellClicked({ data: null, colDef: { field: "name" } } as any);
      wrapper.vm.__test.onCellClicked({ data: row, colDef: {} } as any);

      expect(wrapper.vm.__test.editorPanel.value).toBeNull();
    });

    it("saves and closes the panel on success", async () => {
      const updateSpy = vi.spyOn(tags, "updateTagType").mockResolvedValue({
        ...mockTagType,
        name: { nl: "Updated", en: "Updated", fr: "Updated" },
      });

      const wrapper = await mountWithType();
      const row = wrapper.vm.__test.rowData.value[0];

      wrapper.vm.__test.onCellClicked({
        data: row,
        colDef: { field: "name", headerName: "Name" },
      } as any);
      wrapper.vm.__test.editorPanel.value!.values.nl = "Updated";

      await wrapper.vm.__test.saveEditorPanel();

      expect(updateSpy).toHaveBeenCalledWith(
        row.id,
        expect.objectContaining({ name: expect.any(Object) }),
      );
      expect(wrapper.vm.__test.editorPanel.value).toBeNull();
    });

    it("does nothing when saveEditorPanel is called with no open panel", async () => {
      const updateSpy = vi.spyOn(tags, "updateTagType");
      const wrapper = await mountWithType();

      await wrapper.vm.__test.saveEditorPanel();

      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("does nothing when saveEditorPanel cannot find the row", async () => {
      const updateSpy = vi.spyOn(tags, "updateTagType");
      const wrapper = await mountWithType();

      wrapper.vm.__test.editorPanel.value = {
        rowId: 99999,
        apiField: "name",
        label: "Name",
        values: { nl: "x", en: "", fr: "" },
      };

      await wrapper.vm.__test.saveEditorPanel();

      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("shows saveError when updateTagType fails", async () => {
      vi.spyOn(tags, "updateTagType").mockRejectedValue(new Error("forbidden"));

      const wrapper = await mountWithType();
      const row = wrapper.vm.__test.rowData.value[0];

      wrapper.vm.__test.onCellClicked({
        data: row,
        colDef: { field: "name", headerName: "Name" },
      } as any);

      await wrapper.vm.__test.saveEditorPanel();
      await flushPromises();

      expect(wrapper.vm.__test.saveError.value).toBeTruthy();
      expect(wrapper.vm.__test.editorPanel.value).not.toBeNull();
    });
  });

  describe("edit tags panel", () => {
    async function mountWithType() {
      mockLoad();
      const wrapper = mountTab();
      await flushPromises();
      return wrapper;
    }

    it("is closed by default", async () => {
      const wrapper = await mountWithType();
      expect(wrapper.vm.__test.editTagsPanel.value).toBeNull();
    });

    it("opens when tags cell is clicked", async () => {
      const wrapper = await mountWithType();
      const row = wrapper.vm.__test.rowData.value[0];

      wrapper.vm.__test.onCellClicked({
        data: row,
        colDef: { field: "tags" },
      } as any);

      expect(wrapper.vm.__test.editTagsPanel.value).not.toBeNull();
      expect(wrapper.vm.__test.editTagsPanel.value?.rowId).toBe(row.id);
      expect(wrapper.vm.__test.editTagsPanel.value?.items).toEqual([10]);
    });

    it("closes the panel and clears saveError", async () => {
      const wrapper = await mountWithType();
      const row = wrapper.vm.__test.rowData.value[0];

      wrapper.vm.__test.onCellClicked({
        data: row,
        colDef: { field: "tags" },
      } as any);
      wrapper.vm.__test.saveError.value = "old error";

      wrapper.vm.__test.closeEditTagsPanel();

      expect(wrapper.vm.__test.editTagsPanel.value).toBeNull();
      expect(wrapper.vm.__test.saveError.value).toBeNull();
    });

    it("does nothing when saveEditTagsPanel called with no panel", async () => {
      const updateSpy = vi.spyOn(tags, "updateTag");
      const wrapper = await mountWithType();

      await wrapper.vm.__test.saveEditTagsPanel();

      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("closes without API call when no new tags are added", async () => {
      const updateSpy = vi.spyOn(tags, "updateTag");
      const wrapper = await mountWithType();
      const row = wrapper.vm.__test.rowData.value[0];

      wrapper.vm.__test.onCellClicked({
        data: row,
        colDef: { field: "tags" },
      } as any);
      // panel has [10] which already belongs to type 1 — no additions

      await wrapper.vm.__test.saveEditTagsPanel();

      expect(updateSpy).not.toHaveBeenCalled();
      expect(wrapper.vm.__test.editTagsPanel.value).toBeNull();
    });

    it("saves newly added tags and reloads data", async () => {
      const updateSpy = vi.spyOn(tags, "updateTag").mockResolvedValue(mockTag);
      vi.spyOn(tags, "getTagTypes").mockResolvedValue([mockTagType]);
      vi.spyOn(tags, "getAllTags").mockResolvedValue([mockTag]);

      const wrapper = await mountWithType();
      const row = wrapper.vm.__test.rowData.value[0];

      wrapper.vm.__test.onCellClicked({
        data: row,
        colDef: { field: "tags" },
      } as any);

      // add a new tag ID that wasn't in the type before
      wrapper.vm.__test.editTagsPanel.value!.items = [10, 99];

      await wrapper.vm.__test.saveEditTagsPanel();
      await flushPromises();

      expect(updateSpy).toHaveBeenCalledWith(99, { tag_type: row.id });
      expect(updateSpy).not.toHaveBeenCalledWith(10, expect.anything());
      expect(wrapper.vm.__test.editTagsPanel.value).toBeNull();
    });

    it("shows saveError when updateTag fails", async () => {
      vi.spyOn(tags, "updateTag").mockRejectedValue(new Error("fail"));

      const wrapper = await mountWithType();
      const row = wrapper.vm.__test.rowData.value[0];

      wrapper.vm.__test.onCellClicked({
        data: row,
        colDef: { field: "tags" },
      } as any);
      wrapper.vm.__test.editTagsPanel.value!.items = [10, 99];

      await wrapper.vm.__test.saveEditTagsPanel();
      await flushPromises();

      expect(wrapper.vm.__test.saveError.value).toBeTruthy();
    });
  });

  describe("create tag type modal", () => {
    it("modal is closed by default", async () => {
      mockLoad([], []);
      const wrapper = mountTab();
      await flushPromises();

      expect(wrapper.vm.__test.createModalOpen.value).toBe(false);
    });

    it("opens modal when add button is clicked", async () => {
      mockLoad([], []);
      const wrapper = mountTab();
      await flushPromises();

      await wrapper.find('[data-testid="cms-add-tag-type"]').trigger("click");

      expect(wrapper.vm.__test.createModalOpen.value).toBe(true);
    });

    it("closes modal and resets form", async () => {
      mockLoad([], []);
      const wrapper = mountTab();
      await flushPromises();

      wrapper.vm.__test.setCreateName("nl", "Test");
      wrapper.vm.__test.openCreateModal();
      wrapper.vm.__test.closeCreateModal();

      expect(wrapper.vm.__test.createModalOpen.value).toBe(false);
      expect(wrapper.vm.__test.createForm.value.name.nl).toBe("");
    });

    it("updates create form name via setter", async () => {
      const wrapper = mountTab();

      wrapper.vm.__test.setCreateName("nl", "Genre");

      expect(wrapper.vm.__test.createForm.value.name.nl).toBe("Genre");
    });

    it("toggles extra lang via setter", async () => {
      const wrapper = mountTab();

      wrapper.vm.__test.setCreateExtraLang("en", true);

      expect(wrapper.vm.__test.createExtraLangs.value.en).toBe(true);
    });

    it("clears createError when modal is reopened", async () => {
      mockLoad([], []);
      const wrapper = mountTab();
      await flushPromises();

      wrapper.vm.__test.createError.value = "some error";
      wrapper.vm.__test.openCreateModal();

      expect(wrapper.vm.__test.createError.value).toBeNull();
    });

    it("shows validation error when name is empty", async () => {
      mockLoad([], []);
      const wrapper = mountTab();
      await flushPromises();

      await wrapper.vm.__test.submitCreateTagType();

      expect(wrapper.vm.__test.createError.value).toBeTruthy();
    });

    it("creates tag type and reloads on success", async () => {
      const typesSpy = vi.spyOn(tags, "getTagTypes").mockResolvedValue([mockTagType]);
      vi.spyOn(tags, "getAllTags").mockResolvedValue([]);
      vi.spyOn(tags, "createTagType").mockResolvedValue(mockTagType);

      const wrapper = mountTab();
      await flushPromises();

      wrapper.vm.__test.setCreateName("nl", "Leeftijd");

      await wrapper.vm.__test.submitCreateTagType();
      await flushPromises();

      expect(typesSpy).toHaveBeenCalledTimes(2); // initial load + after create
      expect(wrapper.vm.__test.createModalOpen.value).toBe(false);
    });

    it("shows createError on submit failure", async () => {
      vi.spyOn(tags, "getTagTypes").mockResolvedValue([]);
      vi.spyOn(tags, "getAllTags").mockResolvedValue([]);
      vi.spyOn(tags, "createTagType").mockRejectedValue(new Error("server error"));

      const wrapper = mountTab();
      await flushPromises();

      wrapper.vm.__test.setCreateName("nl", "Leeftijd");

      await wrapper.vm.__test.submitCreateTagType();
      await flushPromises();

      expect(wrapper.vm.__test.createError.value).toBeTruthy();
    });

    it("shows generic createError for non-Error failures", async () => {
      vi.spyOn(tags, "getTagTypes").mockResolvedValue([]);
      vi.spyOn(tags, "getAllTags").mockResolvedValue([]);
      vi.spyOn(tags, "createTagType").mockRejectedValue("raw string error");

      const wrapper = mountTab();
      await flushPromises();

      wrapper.vm.__test.setCreateName("nl", "Leeftijd");

      await wrapper.vm.__test.submitCreateTagType();
      await flushPromises();

      expect(wrapper.vm.__test.createError.value).toBeTruthy();
      expect(wrapper.vm.__test.createError.value).not.toBe("raw string error");
    });
  });

  describe("removing", () => {
    it("opens remove confirm when button is clicked with selection", async () => {
      mockLoad([], []);
      const wrapper = mountTab();
      await flushPromises();

      wrapper.vm.__test.selectedCount.value = 1;
      await wrapper.vm.$nextTick();

      await wrapper.find('[data-testid="cms-remove-tag-types"]').trigger("click");

      expect(wrapper.vm.__test.removeConfirmOpen.value).toBe(true);
    });

    it("confirms removal and reloads data", async () => {
      const typesSpy = vi.spyOn(tags, "getTagTypes").mockResolvedValue([]);
      vi.spyOn(tags, "getAllTags").mockResolvedValue([]);
      const deleteSpy = vi.spyOn(tags, "deleteTagType").mockResolvedValue(undefined as any);

      const wrapper = mountTab();
      await flushPromises();

      const deselectAll = vi.fn();
      vi.spyOn(wrapper.vm.__test.gridApi, "value", "get").mockReturnValue({
        getSelectedRows: () => [{ id: 1 }, { id: 2 }],
        deselectAll,
      } as any);

      wrapper.vm.__test.selectedCount.value = 2;
      wrapper.vm.__test.openRemoveConfirm();
      await wrapper.vm.$nextTick();

      await wrapper.vm.__test.confirmRemove();
      await flushPromises();

      expect(deleteSpy).toHaveBeenCalledWith(1);
      expect(deleteSpy).toHaveBeenCalledWith(2);
      expect(typesSpy).toHaveBeenCalledTimes(2); // initial + after delete
      expect(deselectAll).toHaveBeenCalled();
      expect(wrapper.vm.__test.selectedCount.value).toBe(0);
      expect(wrapper.vm.__test.removeConfirmOpen.value).toBe(false);
    });

    it("keeps confirm open and shows error when deletion fails", async () => {
      vi.spyOn(tags, "getTagTypes").mockResolvedValue([]);
      vi.spyOn(tags, "getAllTags").mockResolvedValue([]);
      vi.spyOn(tags, "deleteTagType").mockRejectedValue(new Error("Forbidden"));

      const wrapper = mountTab();
      await flushPromises();

      vi.spyOn(wrapper.vm.__test.gridApi, "value", "get").mockReturnValue({
        getSelectedRows: () => [{ id: 1 }],
        deselectAll: vi.fn(),
      } as any);

      wrapper.vm.__test.selectedCount.value = 1;
      wrapper.vm.__test.openRemoveConfirm();
      await wrapper.vm.$nextTick();

      await wrapper.vm.__test.confirmRemove();
      await flushPromises();

      expect(wrapper.vm.__test.removeConfirmError.value).toBeTruthy();
      expect(wrapper.vm.__test.removeConfirmOpen.value).toBe(true);
    });
  });

  describe("unmount", () => {
    it("does not throw on unmount", async () => {
      mockLoad([], []);
      const wrapper = mountTab();
      await flushPromises();

      expect(() => wrapper.unmount()).not.toThrow();
    });
  });
});
