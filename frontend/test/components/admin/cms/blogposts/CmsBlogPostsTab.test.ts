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

// -------------------------
// tests
// -------------------------

describe("CmsBlogPostsTab", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------
  // loading
  // --------------------------------------------------

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

  // --------------------------------------------------
  // locale watch => rebuildRows
  // --------------------------------------------------

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

  // --------------------------------------------------
  // editing
  // --------------------------------------------------

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

  // --------------------------------------------------
  // unmount
  // --------------------------------------------------

  it("does not throw on unmount", async () => {
    const wrapper = mountTab();
    await flushPromises();

    expect(() => wrapper.unmount()).not.toThrow();
  });
});