import { describe, expect, it, vi, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent } from "vue";
import type { Tag, TagType } from "@viernulvier/shared";
import { i18n } from "@/i18n";
import CmsTagsTab from "@/components/admin/cms/tags/CmsTagsTab.vue";
import * as tagsService from "@/services/tags";

vi.mock("@/services/tags", () => ({
  getAllTags: vi.fn(),
  getTagTypes: vi.fn(),
  updateTag: vi.fn(),
  createTag: vi.fn(),
  deleteTag: vi.fn(),
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
    vi.spyOn(tagsService, "createTag").mockResolvedValue({ ...mockPublicTag, id: 42 } as never);
    vi.spyOn(tagsService, "deleteTag").mockResolvedValue();
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

  it("opens the create modal with a default tag-type from loaded data", async () => {
    const wrapper = mountTab();
    await flushPromises();
    const api = (wrapper.vm as any).__test;

    api.openCreateModal();
    expect(api.createModalOpen.value).toBe(true);
    expect(api.createForm.value.tagTypeId).toBe(mockTagType.id);
  });

  it("rejects the form when name is empty", async () => {
    const wrapper = mountTab();
    await flushPromises();
    const api = (wrapper.vm as any).__test;

    api.openCreateModal();
    await api.submitCreateTag();

    expect(api.createError.value).toBeTruthy();
    expect(tagsService.createTag).not.toHaveBeenCalled();
  });

  it("rejects the form when no tag type is selected", async () => {
    const wrapper = mountTab();
    await flushPromises();
    const api = (wrapper.vm as any).__test;

    api.openCreateModal();
    api.setCreateName("nl", "Comedy");
    api.setCreateTagType(null);
    await api.submitCreateTag();

    expect(api.createError.value).toBeTruthy();
    expect(tagsService.createTag).not.toHaveBeenCalled();
  });

  it("submits a valid form and reloads data", async () => {
    const wrapper = mountTab();
    await flushPromises();
    const api = (wrapper.vm as any).__test;
    (tagsService.getAllTags as any).mockClear();

    api.openCreateModal();
    api.setCreateName("nl", "Comedy");
    api.setCreatePublic(false);
    api.setCreateExtraLang("en", true);
    await api.submitCreateTag();
    await flushPromises();

    expect(tagsService.createTag).toHaveBeenCalledWith({
      old_id: null,
      name: { nl: "Comedy" },
      tag_type: mockTagType.id,
      public: false,
      productions: [],
    });
    expect(tagsService.getAllTags).toHaveBeenCalled();
    expect(api.createModalOpen.value).toBe(false);
  });

  it("surfaces a create error when createTag rejects", async () => {
    vi.spyOn(tagsService, "createTag").mockRejectedValueOnce(new Error("nope"));
    const wrapper = mountTab();
    await flushPromises();
    const api = (wrapper.vm as any).__test;

    api.openCreateModal();
    api.setCreateName("nl", "Comedy");
    await api.submitCreateTag();

    expect(api.createError.value).toMatch(/nope|fail|fout/i);
    expect(api.createModalOpen.value).toBe(true);
  });

  it("create error uses generic message for non-Error rejections", async () => {
    vi.spyOn(tagsService, "createTag").mockRejectedValueOnce("bad");
    const wrapper = mountTab();
    await flushPromises();
    const api = (wrapper.vm as any).__test;

    api.openCreateModal();
    api.setCreateName("nl", "Comedy");
    await api.submitCreateTag();

    expect(api.createError.value).toBeTruthy();
  });

  it("closeCreateModal resets the form", async () => {
    const wrapper = mountTab();
    await flushPromises();
    const api = (wrapper.vm as any).__test;

    api.openCreateModal();
    api.setCreateName("nl", "x");
    api.setCreateExtraLang("en", true);
    api.closeCreateModal();

    expect(api.createModalOpen.value).toBe(false);
    expect(api.createForm.value.name.nl).toBe("");
    expect(api.createExtraLangs.value.en).toBe(false);
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

  describe("onCellClicked", () => {
    it("opens the edit productions panel when clicking the productions column", async () => {
      const wrapper = mountTab();
      await flushPromises();

      const api = (wrapper.vm as any).__test;
      const row = api.rowData.value.find((r: any) => r.id === mockPublicTag.id);

      expect(api.editProductionsPanel.value).toBeNull();

      api.onCellClicked({
        data: row,
        colDef: { field: "productions" },
      });

      expect(api.editProductionsPanel.value).toEqual({
        rowId: mockPublicTag.id,
        label: expect.any(String),
        items: [1, 2, 3],
        urlBase: "/en/productions",
      });
    });

    it("does nothing when clicking a non-productions column", async () => {
      const wrapper = mountTab();
      await flushPromises();

      const api = (wrapper.vm as any).__test;

      api.onCellClicked({
        data: api.rowData.value[0],
        colDef: { field: "name" },
      });

      expect(api.editProductionsPanel.value).toBeNull();
    });
  });

  describe("editProductionsPanel", () => {
    it("opens the productions panel with the current production ids", async () => {
      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;

      const row = api.rowData.value.find((r: any) => r.id === mockPublicTag.id);

      api.openEditProductionsPanel(row);

      expect(api.editProductionsPanel.value).toEqual({
        rowId: mockPublicTag.id,
        label: expect.any(String),
        items: [1, 2, 3],
        urlBase: "/en/productions",
      });

      expect(api.saveError.value).toBeNull();
    });

    it("opens with an empty list when the tag has no productions", async () => {
      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;

      const row = api.rowData.value.find((r: any) => r.id === mockHiddenTag.id);

      api.openEditProductionsPanel(row);

      expect(api.editProductionsPanel.value).toEqual({
        rowId: mockHiddenTag.id,
        label: expect.any(String),
        items: [],
        urlBase: "/en/productions",
      });
    });

    it("closeEditProductionsPanel clears panel state and save errors", async () => {
      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;

      api.editProductionsPanel.value = {
        rowId: 10,
        label: "Productions",
        items: [1],
      };

      api.saveError.value = "boom";

      api.closeEditProductionsPanel();

      expect(api.editProductionsPanel.value).toBeNull();
      expect(api.saveError.value).toBeNull();
    });

    it("saves productions changes, reloads data and closes the panel", async () => {
      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;

      const row = api.rowData.value.find((r: any) => r.id === mockPublicTag.id);

      api.editProductionsPanel.value = {
        rowId: row.id,
        label: "Productions",
        items: [5, 6],
      };

      (tagsService.getAllTags as any).mockClear();

      await api.saveEditProductionsPanel();
      await flushPromises();

      expect(tagsService.updateTag).toHaveBeenCalledWith(row.id, {
        productions: [5, 6],
      });

      expect(tagsService.getAllTags).toHaveBeenCalled();
      expect(api.editProductionsPanel.value).toBeNull();
      expect(api.isSaving.value).toBe(false);
    });

    it("does nothing when saving without an open panel", async () => {
      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;

      api.editProductionsPanel.value = null;

      await api.saveEditProductionsPanel();

      expect(tagsService.updateTag).not.toHaveBeenCalled();
    });

    it("does nothing when the panel references a missing row", async () => {
      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;

      api.editProductionsPanel.value = {
        rowId: 9999,
        label: "Productions",
        items: [1],
      };

      await api.saveEditProductionsPanel();

      expect(tagsService.updateTag).not.toHaveBeenCalled();
    });

    it("keeps the panel open when saving productions fails", async () => {
      vi.spyOn(tagsService, "updateTag").mockRejectedValueOnce(new Error("boom"));

      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;

      const row = api.rowData.value.find((r: any) => r.id === mockPublicTag.id);

      api.editProductionsPanel.value = {
        rowId: row.id,
        label: "Productions",
        items: [7, 8],
      };

      await expect(api.saveEditProductionsPanel()).rejects.toThrow();

      expect(api.saveError.value).toMatch(/boom|fail|fout/i);
      expect(api.editProductionsPanel.value).not.toBeNull();
      expect(api.isSaving.value).toBe(false);
    });
  });

  describe("delete flow", () => {
    it("guards against opening confirm without a selection", async () => {
      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;

      api.openRemoveConfirm();

      expect(api.removeConfirmOpen.value).toBe(false);
    });

    it("opens the confirm modal once rows are selected", async () => {
      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;

      api.selectedCount.value = 2;
      api.openRemoveConfirm();

      expect(api.removeConfirmOpen.value).toBe(true);
      expect(api.removeConfirmError.value).toBeNull();
    });

    it("closeRemoveConfirm resets state", async () => {
      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;

      api.removeConfirmOpen.value = true;
      api.removeConfirmError.value = "boom";

      api.closeRemoveConfirm();

      expect(api.removeConfirmOpen.value).toBe(false);
      expect(api.removeConfirmError.value).toBeNull();
    });

    it("deletes selected rows, deselects, reloads and closes the modal", async () => {
      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;
      const row = api.rowData.value[0];

      const deselectAll = vi.fn();
      api.selectedCount.value = 1;
      api.gridApi.value = {
        getSelectedRows: () => [row],
        deselectAll,
      };

      api.openRemoveConfirm();
      (tagsService.getAllTags as any).mockClear();
      await api.confirmRemove();
      await flushPromises();

      expect(tagsService.deleteTag).toHaveBeenCalledWith(row.id);
      expect(deselectAll).toHaveBeenCalled();
      expect(tagsService.getAllTags).toHaveBeenCalled();
      expect(api.removeConfirmOpen.value).toBe(false);
      expect(api.selectedCount.value).toBe(0);
    });

    it("closes the modal silently when the selection became empty mid-flight", async () => {
      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;

      api.removeConfirmOpen.value = true;
      api.gridApi.value = { getSelectedRows: () => [], deselectAll: vi.fn() };

      await api.confirmRemove();

      expect(tagsService.deleteTag).not.toHaveBeenCalled();
      expect(api.removeConfirmOpen.value).toBe(false);
    });

    it("surfaces an error when delete fails and keeps the modal open", async () => {
      vi.spyOn(tagsService, "deleteTag").mockRejectedValueOnce(new Error("boom"));
      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;
      const row = api.rowData.value[0];

      api.selectedCount.value = 1;
      api.gridApi.value = {
        getSelectedRows: () => [row],
        deselectAll: vi.fn(),
      };
      api.openRemoveConfirm();
      await api.confirmRemove();

      expect(api.removeConfirmError.value).toMatch(/boom|fail|fout/i);
      expect(api.removeConfirmOpen.value).toBe(true);
    });

    it("uses a generic message for non-Error rejections", async () => {
      vi.spyOn(tagsService, "deleteTag").mockRejectedValueOnce("nope");
      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;
      const row = api.rowData.value[0];

      api.selectedCount.value = 1;
      api.gridApi.value = {
        getSelectedRows: () => [row],
        deselectAll: vi.fn(),
      };
      api.openRemoveConfirm();
      await api.confirmRemove();

      expect(api.removeConfirmError.value).toBeTruthy();
    });
  });
});
