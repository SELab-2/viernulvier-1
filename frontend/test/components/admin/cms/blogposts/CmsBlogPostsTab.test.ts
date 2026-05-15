import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { ref } from "vue";
import CmsBlogPostsTab from "@/components/admin/cms/blogposts/CmsBlogPostsTab.vue";
import * as blogposts from "@/services/blogposts";
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

vi.mock("@/composables/useCmsBlogPostsGrid", () => ({
  useCmsBlogPostsGrid: () => ({
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
// helper
// -------------------------

function mountTab() {
  return mount(CmsBlogPostsTab, {
    global: {
      plugins: [i18n],
    },
  });
}

const mockPost = {
  id: 1,
  title: { en: "Hello", nl: "Hallo", fr: "Bonjour" },
  content: { en: "World", nl: "Wereld", fr: "Monde" },
  published_at: null,
  productions: [],
} as any;

// -------------------------
// tests
// -------------------------

describe("CmsBlogPostsTab", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("loading", () => {
    it("loads blogposts on mount", async () => {
      const spy = vi.spyOn(blogposts, "getBlogPosts").mockResolvedValue([
        {
          id: 1,
          title: { en: "Hello" },
          content: { en: "World" },
          published_at: null,
          productions: [],
        } as any,
      ]);

      const wrapper = mountTab();
      await flushPromises();

      expect(spy).toHaveBeenCalledOnce();
      expect(wrapper.vm.__test.isLoading.value).toBe(false);
      expect(wrapper.vm.__test.rowData.value.length).toBe(1);
    });

    it("handles load error", async () => {
      vi.spyOn(blogposts, "getBlogPosts").mockRejectedValue(new Error("fail"));

      const wrapper = mountTab();
      await flushPromises();

      expect(wrapper.vm.__test.loadError.value).toBeTruthy();
      expect(wrapper.vm.__test.rowData.value.length).toBe(0);
    });

    it("uses generic load error for non-Error values", async () => {
      vi.spyOn(blogposts, "getBlogPosts").mockRejectedValue("boom");

      const wrapper = mountTab();
      await flushPromises();

      expect(wrapper.vm.__test.loadError.value).toBeTruthy();
    });

    it("handles missing language map fields", async () => {
      vi.spyOn(blogposts, "getBlogPosts").mockResolvedValue([
        {
          id: 1,
          title: null,
          content: undefined,
          published_at: null,
          productions: [],
        } as any,
      ]);

      const wrapper = mountTab();
      await flushPromises();

      expect(wrapper.vm.__test.rowData.value[0].title).toBe("");
      expect(wrapper.vm.__test.rowData.value[0].content).toBe("");
    });
  });  

  describe("locale watch", () => {
    it("rebuilds rows when locale changes", async () => {
      const spy = vi.spyOn(blogposts, "getBlogPosts").mockResolvedValue([
        {
          id: 1,
          title: { en: "Hello", nl: "Hallo" },
          content: { en: "World", nl: "Wereld" },
          published_at: null,
          productions: [],
        } as any,
      ]);

      const wrapper = mountTab();
      await flushPromises();

      const initial = wrapper.vm.__test.rowData.value[0].title;

      // change locale
      (i18n.global.locale as any).value = "en";
      await wrapper.vm.$nextTick();

      const updated = wrapper.vm.__test.rowData.value[0].title;

      expect(spy).toHaveBeenCalledOnce();
      expect(initial).not.toBe(updated);
    });
  });

  describe("editing", () => {
    it("reverts unchanged edits", async () => {
      vi.spyOn(blogposts, "getBlogPosts").mockResolvedValue([
        {
          id: 1,
          title: { en: "Hello" },
          content: { en: "World" },
          published_at: null,
          productions: [],
        } as any,
      ]);

      const wrapper = mountTab();
      await flushPromises();

      const row = wrapper.vm.__test.rowData.value[0];

      const event = {
        data: row,
        colDef: { field: "title" },
        value: row.title,
        oldValue: row.title,
        node: {
          setDataValue: vi.fn(),
        },
      } as any;

      await wrapper.vm.__test.onCellEditingStopped(event);

      expect(event.node.setDataValue).not.toHaveBeenCalled();
    });

    it("rejects empty title edit", async () => {
      vi.spyOn(blogposts, "getBlogPosts").mockResolvedValue([
        {
          id: 1,
          title: { en: "Hello" },
          content: { en: "World" },
          published_at: null,
          productions: [],
        } as any,
      ]);

      const wrapper = mountTab();
      await flushPromises();

      const row = wrapper.vm.__test.rowData.value[0];

      const event = {
        data: row,
        colDef: { field: "title" },
        value: "   ",
        oldValue: "Hello",
        node: {
          setDataValue: vi.fn(),
        },
      } as any;

      await wrapper.vm.__test.onCellEditingStopped(event);

      expect(event.node.setDataValue).toHaveBeenCalled();
    });

    it("saves title update", async () => {
      vi.spyOn(blogposts, "getBlogPosts").mockResolvedValue([
        {
          id: 1,
          title: { en: "Hello" },
          content: { en: "World" },
          published_at: null,
          productions: [],
        } as any,
      ]);

      const updateSpy = vi
        .spyOn(blogposts, "updateBlogPost")
        .mockResolvedValue({
          id: 1,
          title: { en: "Updated" },
          content: { en: "World" },
          published_at: null,
          productions: [],
        } as any);

      const wrapper = mountTab();
      await flushPromises();

      const row = wrapper.vm.__test.rowData.value[0];

      const event = {
        data: row,
        colDef: { field: "title" },
        value: "Updated",
        oldValue: "Hello",
        node: {
          setDataValue: vi.fn(),
        },
      } as any;

      await wrapper.vm.__test.onCellEditingStopped(event);
      await flushPromises();

      expect(updateSpy).toHaveBeenCalledWith(1, expect.any(Object));
      expect(wrapper.vm.__test.saveError.value).toBeNull();
    });

    it("handles save error", async () => {
      vi.spyOn(blogposts, "getBlogPosts").mockResolvedValue([
        {
          id: 1,
          title: { en: "Hello" },
          content: { en: "World" },
          published_at: null,
          productions: [],
        } as any,
      ]);

      vi.spyOn(blogposts, "updateBlogPost").mockRejectedValue(
        new Error("fail"),
      );

      const wrapper = mountTab();
      await flushPromises();

      const row = wrapper.vm.__test.rowData.value[0];

      const event = {
        data: row,
        colDef: { field: "title" },
        value: "Updated",
        oldValue: "Hello",
        node: {
          setDataValue: vi.fn(),
        },
      } as any;

      await wrapper.vm.__test.onCellEditingStopped(event);
      await flushPromises();

      expect(wrapper.vm.__test.saveError.value).toBeTruthy();
    });

    it("uses generic save error for non-Error values", async () => {
      vi.spyOn(blogposts, "getBlogPosts").mockResolvedValue([
        {
          id: 1,
          title: { en: "Hello" },
          content: { en: "World" },
          published_at: null,
          productions: [],
        } as any,
      ]);

      vi.spyOn(blogposts, "updateBlogPost").mockRejectedValue("boom");

      const wrapper = mountTab();
      await flushPromises();

      const row = wrapper.vm.__test.rowData.value[0];

      await wrapper.vm.__test.onCellEditingStopped({
        data: row,
        colDef: { field: "title" },
        value: "Updated",
        oldValue: "Hello",
        node: { setDataValue: vi.fn() },
      } as any);

      expect(wrapper.vm.__test.saveError.value).toBeTruthy();
    });

    it("ignores non-editable fields", async () => {
      vi.spyOn(blogposts, "getBlogPosts").mockResolvedValue([
        {
          id: 1,
          title: { en: "Hello" },
          content: { en: "World" },
          published_at: null,
          productions: [],
        } as any,
      ]);

      const updateSpy = vi.spyOn(blogposts, "updateBlogPost");

      const wrapper = mountTab();
      await flushPromises();

      const row = wrapper.vm.__test.rowData.value[0];

      const event = {
        data: row,
        colDef: { field: "publishedAt" },
        value: "x",
        oldValue: "y",
        node: {
          setDataValue: vi.fn(),
        },
      } as any;

      await wrapper.vm.__test.onCellEditingStopped(event);

      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("onCellEditingStopped - returns early when event data is missing", async () => {
      const wrapper = mountTab();
      await flushPromises();

      await wrapper.vm.__test.onCellEditingStopped({
        data: null,
        colDef: { field: "title" },
      } as any);

      expect(true).toBe(true); // just ensures no crash
    });
  });

  describe("editor panel", () => {
    async function mountWithPost() {
      vi.spyOn(blogposts, "getBlogPosts").mockResolvedValue([mockPost]);
      const wrapper = mountTab();
      await flushPromises();
      return wrapper;
    }

    it("is closed by default", async () => {
      const wrapper = await mountWithPost();
      expect(wrapper.vm.__test.editorPanel.value).toBeNull();
    });

    it("opens for the title column on cell click", async () => {
      const wrapper = await mountWithPost();
      const row = wrapper.vm.__test.rowData.value[0];

      wrapper.vm.__test.onCellClicked({
        data: row,
        colDef: { field: "title", headerName: "Title" },
      } as any);

      expect(wrapper.vm.__test.editorPanel.value).not.toBeNull();
      expect(wrapper.vm.__test.editorPanel.value?.rowId).toBe(row.id);
      expect(wrapper.vm.__test.editorPanel.value?.apiField).toBe("title");
      expect(wrapper.vm.__test.editorPanel.value?.label).toBe("Title");
    });

    it("opens for the content column on cell click", async () => {
      const wrapper = await mountWithPost();
      const row = wrapper.vm.__test.rowData.value[0];

      wrapper.vm.__test.onCellClicked({
        data: row,
        colDef: { field: "content", headerName: "Content" },
      } as any);

      expect(wrapper.vm.__test.editorPanel.value?.apiField).toBe("content");
    });

    it("pre-fills values from the source blogpost", async () => {
      const wrapper = await mountWithPost();
      const row = wrapper.vm.__test.rowData.value[0];

      wrapper.vm.__test.onCellClicked({
        data: row,
        colDef: { field: "title", headerName: "Title" },
      } as any);

      const values = wrapper.vm.__test.editorPanel.value?.values;
      expect(values?.en).toBe("Hello");
      expect(values?.nl).toBe("Hallo");
      expect(values?.fr).toBe("Bonjour");
    });

    it("ignores clicks on non-panel columns", async () => {
      const wrapper = await mountWithPost();
      const row = wrapper.vm.__test.rowData.value[0];

      wrapper.vm.__test.onCellClicked({
        data: row,
        colDef: { field: "publishedAt" },
      } as any);

      expect(wrapper.vm.__test.editorPanel.value).toBeNull();
    });

    it("ignores clicks with no data or no field", async () => {
      const wrapper = await mountWithPost();
      const row = wrapper.vm.__test.rowData.value[0];

      wrapper.vm.__test.onCellClicked({ data: null, colDef: { field: "title" } } as any);
      wrapper.vm.__test.onCellClicked({ data: row, colDef: {} } as any);

      expect(wrapper.vm.__test.editorPanel.value).toBeNull();
    });

    it("clears saveError when the panel is opened", async () => {
      const wrapper = await mountWithPost();
      const row = wrapper.vm.__test.rowData.value[0];

      wrapper.vm.__test.saveError.value = "old error";
      wrapper.vm.__test.onCellClicked({
        data: row,
        colDef: { field: "title", headerName: "Title" },
      } as any);

      expect(wrapper.vm.__test.saveError.value).toBeNull();
    });

    it("closes the panel and clears saveError", async () => {
      const wrapper = await mountWithPost();
      const row = wrapper.vm.__test.rowData.value[0];

      wrapper.vm.__test.onCellClicked({
        data: row,
        colDef: { field: "title", headerName: "Title" },
      } as any);
      wrapper.vm.__test.saveError.value = "some error";

      wrapper.vm.__test.closeEditorPanel();

      expect(wrapper.vm.__test.editorPanel.value).toBeNull();
      expect(wrapper.vm.__test.saveError.value).toBeNull();
    });

    it("saves the panel and closes it on success", async () => {
      const updateSpy = vi.spyOn(blogposts, "updateBlogPost").mockResolvedValue({
        ...mockPost,
        title: { en: "Updated", nl: "Bijgewerkt", fr: "Mis à jour" },
      } as any);

      const wrapper = await mountWithPost();
      const row = wrapper.vm.__test.rowData.value[0];

      wrapper.vm.__test.onCellClicked({
        data: row,
        colDef: { field: "title", headerName: "Title" },
      } as any);
      wrapper.vm.__test.editorPanel.value!.values.en = "Updated";

      await wrapper.vm.__test.saveEditorPanel();

      expect(updateSpy).toHaveBeenCalledWith(
        row.id,
        expect.objectContaining({ title: expect.any(Object) }),
      );
      expect(wrapper.vm.__test.editorPanel.value).toBeNull();
    });

    it("does nothing when saveEditorPanel is called with no open panel", async () => {
      const updateSpy = vi.spyOn(blogposts, "updateBlogPost");
      const wrapper = await mountWithPost();

      await wrapper.vm.__test.saveEditorPanel();

      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("does nothing when saveEditorPanel cannot find the row", async () => {
      const updateSpy = vi.spyOn(blogposts, "updateBlogPost");
      const wrapper = await mountWithPost();

      wrapper.vm.__test.editorPanel.value = {
        rowId: 99999,
        apiField: "title",
        label: "Title",
        values: { nl: "x", en: "", fr: "" },
      };

      await wrapper.vm.__test.saveEditorPanel();

      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  describe("create blog post", () => {
    it("modal is closed by default", async () => {
      const wrapper = mountTab();
      await flushPromises();

      expect(
        wrapper.find('[data-testid="create-blogpost-modal"]').exists(),
      ).toBe(false);
    });

    it("opens modal when add button is clicked", async () => {
      const wrapper = mountTab();
      await flushPromises();

      await wrapper
        .find('[data-testid="cms-add-blogpost"]')
        .trigger("click");

      expect(
        wrapper.find('[data-testid="create-blogpost-modal"]').exists(),
      ).toBe(true);
    });

    it("closes modal on close emit", async () => {
      const wrapper = mountTab();
      await flushPromises();

      wrapper.vm.__test.openCreateModal();
      await wrapper.vm.$nextTick();

      await wrapper
        .find('[data-testid="modal-close"]')
        .trigger("click");

      expect(
        wrapper.find('[data-testid="create-blogpost-modal"]').exists(),
      ).toBe(false);
    });

    it("resets form on close", async () => {
      const wrapper = mountTab();
      await flushPromises();

      wrapper.vm.__test.setCreateTitle("nl", "Hello");
      wrapper.vm.__test.setCreateContent("nl", "World");

      wrapper.vm.__test.closeCreateModal();

      expect(wrapper.vm.__test.createForm.value.title.nl).toBe("");
      expect(wrapper.vm.__test.createForm.value.content.nl).toBe("");
      expect(wrapper.vm.__test.createForm.value.productions).toEqual([]);
    });

    it("updates title via setter", async () => {
      const wrapper = mountTab();

      wrapper.vm.__test.setCreateTitle("nl", "My title");

      expect(wrapper.vm.__test.createForm.value.title.nl).toBe("My title");
    });

    it("updates content via setter", async () => {
      const wrapper = mountTab();

      wrapper.vm.__test.setCreateContent("nl", "My content");

      expect(wrapper.vm.__test.createForm.value.content.nl).toBe(
        "My content",
      );
    });

    it("adds production via setter", async () => {
      const wrapper = mountTab();

      wrapper.vm.__test.addProductionId(12);

      expect(
        wrapper.vm.__test.createForm.value.productions,
      ).toContain(12);
    });

    it("removes production via setter", async () => {
      const wrapper = mountTab();

      wrapper.vm.__test.addProductionId(12);
      wrapper.vm.__test.removeProductionId(12);

      expect(
        wrapper.vm.__test.createForm.value.productions,
      ).not.toContain(12);
    });

    it("submits and reloads on success", async () => {
      const getSpy = vi
        .spyOn(blogposts, "getBlogPosts")
        .mockResolvedValue([]);

      vi.spyOn(blogposts, "createBlogPost").mockResolvedValue({
        id: 99,
        title: { nl: "Hello", en: "Hello", fr: "Bonjour" },
        content: { en: "World" },
        published_at: null,
        productions: [12],
      } as any);

      const wrapper = mountTab();
      await flushPromises();

      wrapper.vm.__test.setCreateTitle("nl", "Hallo");
      wrapper.vm.__test.setCreateExtraLang("en", true);
      wrapper.vm.__test.setCreateTitle("en", "Hello");
      wrapper.vm.__test.setCreateContent("en", "World");
      wrapper.vm.__test.setCreateExtraLang("fr", true);
      wrapper.vm.__test.setCreateTitle("fr", "Bonjour");
      wrapper.vm.__test.addProductionId(12);
      wrapper.vm.__test.addProductionId(12); // does nothing, just for extra coverage

      await wrapper.vm.__test.submitCreateBlogPost();
      await flushPromises();

      expect(getSpy).toHaveBeenCalledTimes(2);
      expect(wrapper.vm.__test.createModalOpen.value).toBe(false);
    });

    it("shows create error on submit failure", async () => {
      vi.spyOn(blogposts, "getBlogPosts").mockResolvedValue([]);

      vi.spyOn(blogposts, "createBlogPost").mockRejectedValue(
        new Error("boom"),
      );

      const wrapper = mountTab();
      await flushPromises();

      await wrapper.vm.__test.submitCreateBlogPost();
      await flushPromises();

      expect(wrapper.vm.__test.createError.value).toBeTruthy();
      expect(wrapper.vm.__test.createModalOpen.value).toBe(false);
    });

    it("clears createError when modal is reopened", async () => {
      const wrapper = mountTab();
      await flushPromises();

      wrapper.vm.__test.createError.value = "old error";

      wrapper.vm.__test.openCreateModal();

      expect(wrapper.vm.__test.createError.value).toBeNull();
    });

    it("sets generic error for non-Error failures", async () => {
      vi.spyOn(blogposts, "getBlogPosts").mockResolvedValue([]);

      vi.spyOn(blogposts, "createBlogPost").mockRejectedValue(
        "raw error",
      );

      const wrapper = mountTab();
      await flushPromises();

      await wrapper.vm.__test.submitCreateBlogPost();
      await flushPromises();

      expect(wrapper.vm.__test.createError.value).toBeTruthy();
      expect(wrapper.vm.__test.createError.value).not.toBe(
        "raw error",
      );
    });
  });

  describe("removing", () => {
    it("open modal by clicking button", async () => {
      const wrapper = mountTab();
      await flushPromises();

      // enable button
      wrapper.vm.__test.selectedCount.value = 1;

      await wrapper.vm.$nextTick();

      await wrapper.find('[data-testid="cms-remove-blogposts"]').trigger("click");

      expect(wrapper.find('.cms-remove-modal').exists()).toBe(true);
    });

    it("confirms removal successfully and reloads data", async () => {
      const getSpy = vi
        .spyOn(blogposts, "getBlogPosts")
        .mockResolvedValue([]);

      const deleteSpy = vi
        .spyOn(blogposts, "deleteBlogPost")
        .mockResolvedValue(undefined as any);

      const wrapper = mountTab();
      await flushPromises();

      // mock selected rows
      const deselectAll = vi.fn();

      vi.spyOn(wrapper.vm.__test.gridApi, "value", "get").mockReturnValue({
        getSelectedRows: () => [
          { id: 1 },
          { id: 2 },
        ],
        deselectAll,
      } as any);

      wrapper.vm.__test.selectedCount.value = 2;

      wrapper.vm.__test.openRemoveConfirm();
      await wrapper.vm.$nextTick();

      await wrapper.vm.__test.confirmRemove();
      await flushPromises();

      expect(deleteSpy).toHaveBeenCalledWith(1);
      expect(deleteSpy).toHaveBeenCalledWith(2);

      // reload happened (initial + after delete)
      expect(getSpy).toHaveBeenCalledTimes(2);

      expect(deselectAll).toHaveBeenCalled();
      expect(wrapper.vm.__test.selectedCount.value).toBe(0);
      expect(wrapper.vm.__test.removeConfirmOpen.value).toBe(false);
    });

    it("keeps modal open and shows error when delete fails", async () => {
      vi.spyOn(blogposts, "getBlogPosts").mockResolvedValue([]);

      vi.spyOn(blogposts, "deleteBlogPost")
        .mockRejectedValue(new Error("Forbidden"));

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
      const wrapper = mountTab();
      await flushPromises();

      expect(() => wrapper.unmount()).not.toThrow();
    });
  });
});