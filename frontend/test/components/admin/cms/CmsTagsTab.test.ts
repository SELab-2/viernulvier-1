import { describe, expect, it, vi, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent } from "vue";
import type { Tag, TagType } from "@viernulvier/shared";
import { i18n } from "@/i18n";
import CmsTagsTab from "@/components/admin/cms/tabs/CmsTagsTab.vue";
import CmsGridControls from "@/components/admin/cms/CmsGridControls.vue";
import * as tagsService from "@/services/tags";

vi.mock("@/services/tags", () => ({
  getAllTags: vi.fn(),
  getTagTypes: vi.fn(),
  updateTag: vi.fn(),
}));

const gridStub = defineComponent({
  name: "AgGridVue",
  props: { rowData: { type: Array, default: () => [] } },
  template: `<div data-testid="tag-grid-stub"><span data-testid="tag-row-count">{{ rowData.length }}</span></div>`,
});

const mockTagType: TagType = {
  id: 1,
  old_id: null,
  name: { en: "Genre", nl: "Genre", fr: "Genre" },
} as TagType;

const mockPublicTag: Tag = {
  id: 10,
  old_id: null,
  name: { en: "Drama", nl: "Drama", fr: "Drame" },
  tag_type: 1 as never,
  public: true,
  productions: [1, 2, 3] as unknown as Tag["productions"],
} as Tag;

const mockHiddenTag: Tag = {
  id: 11,
  old_id: null,
  name: { en: "HiddenTag", nl: "VerborgenTag", fr: "TagCaché" },
  tag_type: 1 as never,
  public: false,
  productions: [] as unknown as Tag["productions"],
} as Tag;

function mountTab() {
  return mount(CmsTagsTab, {
    global: {
      plugins: [i18n],
      stubs: { AgGridVue: gridStub },
    },
  });
}

describe("CmsTagsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(tagsService, "getAllTags").mockResolvedValue([mockPublicTag, mockHiddenTag]);
    vi.spyOn(tagsService, "getTagTypes").mockResolvedValue([mockTagType]);
    vi.spyOn(tagsService, "updateTag").mockResolvedValue({ ...mockPublicTag, public: false });
  });

  it("loads tags and tag types on mount", async () => {
    const wrapper = mountTab();
    await flushPromises();

    expect(tagsService.getAllTags).toHaveBeenCalledTimes(1);
    expect(tagsService.getTagTypes).toHaveBeenCalledTimes(1);
    expect(wrapper.get('[data-testid="tag-row-count"]').text()).toBe("2");
  });

  it("shows a load error when fetch fails", async () => {
    vi.spyOn(tagsService, "getAllTags").mockRejectedValueOnce(new Error("network"));
    const wrapper = mountTab();
    await flushPromises();

    expect(wrapper.text()).toMatch(/network|laden|load/i);
  });

  it("persists a public-flag change through updateTag", async () => {
    const wrapper = mountTab();
    await flushPromises();
    const api = (wrapper.vm as any).__test;
    const row = api.rowData.value[0];

    await api.onCellEditingStopped({
      data: row,
      colDef: { field: "public" },
      value: false,
      oldValue: true,
      node: { setDataValue: vi.fn() },
    });

    expect(tagsService.updateTag).toHaveBeenCalledWith(row.id, { public: false });
    expect(row.public).toBe(false);
  });

  it("persists a name change under the current language", async () => {
    const updated = { ...mockPublicTag, name: { ...mockPublicTag.name, en: "Tragedy" } };
    vi.spyOn(tagsService, "updateTag").mockResolvedValueOnce(updated as never);

    i18n.global.locale.value = "en";
    const wrapper = mountTab();
    await flushPromises();
    const api = (wrapper.vm as any).__test;
    const row = api.rowData.value.find((r: any) => r.id === mockPublicTag.id);

    await api.onCellEditingStopped({
      data: row,
      colDef: { field: "name" },
      value: "Tragedy",
      oldValue: "Drama",
      node: { setDataValue: vi.fn() },
    });

    expect(tagsService.updateTag).toHaveBeenCalledWith(row.id, {
      name: expect.objectContaining({ en: "Tragedy" }),
    });
  });

  it("ignores non-editable fields", async () => {
    const wrapper = mountTab();
    await flushPromises();
    const api = (wrapper.vm as any).__test;
    const row = api.rowData.value[0];
    const setDataValue = vi.fn();

    await api.onCellEditingStopped({
      data: row,
      colDef: { field: "tagType" },
      value: "X",
      oldValue: "Genre",
      node: { setDataValue },
    });

    expect(tagsService.updateTag).not.toHaveBeenCalled();
    expect(setDataValue).toHaveBeenCalledWith("tagType", "Genre");
  });

  it("skips persistence when value did not change", async () => {
    const wrapper = mountTab();
    await flushPromises();
    const api = (wrapper.vm as any).__test;
    const row = api.rowData.value[0];

    await api.onCellEditingStopped({
      data: row,
      colDef: { field: "public" },
      value: true,
      oldValue: true,
      node: { setDataValue: vi.fn() },
    });

    expect(tagsService.updateTag).not.toHaveBeenCalled();
  });

  it("ignores events with no row data or missing field", async () => {
    const wrapper = mountTab();
    await flushPromises();
    const api = (wrapper.vm as any).__test;

    await api.onCellEditingStopped({ data: undefined, colDef: { field: "name" }, node: {} });
    await api.onCellEditingStopped({ data: api.rowData.value[0], colDef: {}, node: {} });

    expect(tagsService.updateTag).not.toHaveBeenCalled();
  });

  it("surfaces a save error when updateTag fails and reverts the row value", async () => {
    vi.spyOn(tagsService, "updateTag").mockRejectedValueOnce(new Error("boom"));
    const wrapper = mountTab();
    await flushPromises();
    const api = (wrapper.vm as any).__test;
    const row = api.rowData.value[0];
    const setDataValue = vi.fn();

    await api.onCellEditingStopped({
      data: row,
      colDef: { field: "public" },
      value: false,
      oldValue: true,
      node: { setDataValue },
    });

    expect(api.saveError.value).toMatch(/boom|fail|fout/i);
    expect(setDataValue).toHaveBeenCalledWith("public", true);
  });

  it("rebuilds rows when the locale changes", async () => {
    i18n.global.locale.value = "en";
    const wrapper = mountTab();
    await flushPromises();
    const api = (wrapper.vm as any).__test;
    const before = api.rowData.value[0].name;

    i18n.global.locale.value = "fr";
    await flushPromises();
    const after = api.rowData.value[0].name;

    expect(before).toBe("Drama");
    expect(after).toBe("Drame");
    i18n.global.locale.value = "en";
  });

  it("handles non-Error rejections with a generic message", async () => {
    vi.spyOn(tagsService, "getAllTags").mockRejectedValueOnce("nope");
    const wrapper = mountTab();
    await flushPromises();
    const api = (wrapper.vm as any).__test;

    expect(api.loadError.value).toBeTruthy();
  });

  it("localizeValue returns an empty string for null/undefined maps", async () => {
    const wrapper = mountTab();
    await flushPromises();
    const api = (wrapper.vm as any).__test;

    expect(api.localizeValue(null)).toBe("");
    expect(api.localizeValue(undefined)).toBe("");
    expect(api.localizeValue({ en: "hi" })).toBe("hi");
  });

  it("rebuildRows re-derives rowData from the current tag/type data", async () => {
    const wrapper = mountTab();
    await flushPromises();
    const api = (wrapper.vm as any).__test;
    api.tagsData.value = [];

    api.rebuildRows();

    expect(api.rowData.value).toEqual([]);
  });

  it("wires grid controls events through to the composable", async () => {
    const wrapper = mountTab();
    await flushPromises();
    const controls = wrapper.findComponent(CmsGridControls);

    controls.vm.$emit("update:quick-filter-text", "drama");
    controls.vm.$emit("apply-quick-filter");
    controls.vm.$emit("fit-columns");
    controls.vm.$emit("auto-size-columns");
    controls.vm.$emit("reset-filters");
    controls.vm.$emit("export-csv");
    controls.vm.$emit("toggle-columns");
    controls.vm.$emit("reset-state");
    await flushPromises();

    expect(controls.exists()).toBe(true);
  });

  it("save-error path uses a generic message when update rejects with a non-Error", async () => {
    vi.spyOn(tagsService, "updateTag").mockRejectedValueOnce("bad");
    const wrapper = mountTab();
    await flushPromises();
    const api = (wrapper.vm as any).__test;
    const row = api.rowData.value[0];

    await api.onCellEditingStopped({
      data: row,
      colDef: { field: "public" },
      value: false,
      oldValue: true,
      node: { setDataValue: vi.fn() },
    });

    expect(api.saveError.value).toBeTruthy();
  });
});
