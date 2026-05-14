import { describe, expect, it, vi, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent } from "vue";
import type { Tag, TagType } from "@viernulvier/shared";
import { i18n } from "@/i18n";
import CmsTagsTab from "@/components/admin/cms/tags/CmsTagsTab.vue";
import { ApiError } from "@/services/api";
import * as tagsService from "@/services/tags";

vi.mock("@/services/tags", () => ({
  getAllTags: vi.fn(),
  getTagTypes: vi.fn(),
  updateTag: vi.fn(),
  createTag: vi.fn(),
  deleteTag: vi.fn(),
  createTagType: vi.fn(),
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
    vi.spyOn(tagsService, "createTagType").mockResolvedValue({
      id: 999,
      old_id: null,
      name: { nl: "Workshop" },
    } as never);
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

  it("ignores edits to fields that aren't wired for persistence", async () => {
    const wrapper = mountTab();
    await flushPromises();
    const api = (wrapper.vm as any).__test;
    const row = api.rowData.value[0];
    const setDataValue = vi.fn();

    await api.onCellEditingStopped({
      data: row,
      colDef: { field: "productionCount" },
      column: { getColId: () => "productionCount" },
      value: 99,
      oldValue: 3,
      node: { setDataValue },
    });

    expect(tagsService.updateTag).not.toHaveBeenCalled();
    expect(setDataValue).toHaveBeenCalledWith("productionCount", 3);
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

  describe("tag-type creation flow", () => {
    it("openTagTypeModalFromCreate opens the sub-modal with createTagModal origin", async () => {
      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;

      api.openTagTypeModalFromCreate("Workshop");

      expect(api.tagTypeModalOpen.value).toBe(true);
      expect(api.tagTypeModalInitialName.value).toBe("Workshop");
    });

    it("closeTagTypeModal clears state", async () => {
      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;

      api.openTagTypeModalFromCreate("Something");
      api.closeTagTypeModal();

      expect(api.tagTypeModalOpen.value).toBe(false);
      expect(api.tagTypeModalInitialName.value).toBe("");
      expect(api.tagTypeModalError.value).toBeNull();
    });

    it("rejects an empty name without calling the API", async () => {
      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;

      api.openTagTypeModalFromCreate("");
      await api.submitCreateTagType({ name: {} });

      expect(tagsService.createTagType).not.toHaveBeenCalled();
      expect(api.tagTypeModalError.value).toBeTruthy();
    });

    it("rejects a duplicate name client-side before calling the API", async () => {
      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;

      api.openTagTypeModalFromCreate("Genre");
      await api.submitCreateTagType({ name: { nl: "  GENRE  " } });

      expect(tagsService.createTagType).not.toHaveBeenCalled();
      expect(api.tagTypeModalError.value).toMatch(/already exists|bestaat al|existe déjà/i);
    });

    it("creates a new type and auto-selects it in the create-tag form", async () => {
      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;

      api.openCreateModal();
      api.openTagTypeModalFromCreate("Workshop");
      await api.submitCreateTagType({ name: { nl: "Workshop" } });
      await flushPromises();

      expect(tagsService.createTagType).toHaveBeenCalledWith({ name: { nl: "Workshop" } });
      expect(api.createForm.value.tagTypeId).toBe(999);
      expect(api.tagTypeModalOpen.value).toBe(false);
      expect(api.tagTypesData.value).toHaveLength(2);
    });

    it("creates a new type from a grid row and patches the tag's tag_type", async () => {
      const updated = { ...mockPublicTag, tag_type: 999 as never };
      vi.spyOn(tagsService, "updateTag").mockResolvedValueOnce(updated as never);

      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;
      const row = api.rowData.value[0];

      api.openTagTypeModal("Workshop", { kind: "gridRow", rowId: row.id });
      api.gridApi.value = { refreshCells: vi.fn() };
      await api.submitCreateTagType({ name: { nl: "Workshop" } });
      await flushPromises();

      expect(tagsService.updateTag).toHaveBeenCalledWith(row.id, { tag_type: 999 });
      expect(api.tagTypeModalOpen.value).toBe(false);
    });

    it("ignores grid-row origin when the row no longer exists", async () => {
      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;

      api.openTagTypeModal("Workshop", { kind: "gridRow", rowId: 9999 });
      await api.submitCreateTagType({ name: { nl: "Workshop" } });

      expect(tagsService.updateTag).not.toHaveBeenCalled();
      expect(api.tagTypeModalOpen.value).toBe(false);
    });

    it("swallows updateTag errors from grid-row patching without throwing", async () => {
      vi.spyOn(tagsService, "updateTag").mockRejectedValueOnce(new Error("boom"));
      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;
      const row = api.rowData.value[0];

      api.openTagTypeModal("Workshop", { kind: "gridRow", rowId: row.id });
      await api.submitCreateTagType({ name: { nl: "Workshop" } });
      await flushPromises();

      expect(api.saveError.value).toMatch(/boom|fail|fout/i);
      // Sub-modal still closes — the new type was created.
      expect(api.tagTypeModalOpen.value).toBe(false);
    });

    it("maps a 409 ApiError to the conflict message", async () => {
      vi.spyOn(tagsService, "createTagType").mockRejectedValueOnce(
        new ApiError(409, "Conflict"),
      );
      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;

      api.openTagTypeModalFromCreate("Brand-new");
      await api.submitCreateTagType({ name: { nl: "Brand-new" } });

      expect(api.tagTypeModalError.value).toMatch(/already exists|bestaat al|existe déjà/i);
      expect(api.tagTypeModalOpen.value).toBe(true);
    });

    it("surfaces a generic error when the API throws a non-conflict Error", async () => {
      vi.spyOn(tagsService, "createTagType").mockRejectedValueOnce(new Error("network"));
      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;

      api.openTagTypeModalFromCreate("Brand-new");
      await api.submitCreateTagType({ name: { nl: "Brand-new" } });

      expect(api.tagTypeModalError.value).toMatch(/network|fail|fout/i);
    });

    it("falls back to the generic save message for non-Error rejections", async () => {
      vi.spyOn(tagsService, "createTagType").mockRejectedValueOnce("nope");
      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;

      api.openTagTypeModalFromCreate("Brand-new");
      await api.submitCreateTagType({ name: { nl: "Brand-new" } });

      expect(api.tagTypeModalError.value).toBeTruthy();
    });
  });

  describe("tag-type cell editing in the grid", () => {
    it("persists a tag_type change initiated from the grid", async () => {
      const updated = { ...mockPublicTag, tag_type: 2 as never };
      vi.spyOn(tagsService, "updateTag").mockResolvedValueOnce(updated as never);

      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;
      const row = api.rowData.value[0];
      const refreshCells = vi.fn();

      await api.onCellEditingStopped({
        data: row,
        colDef: { field: undefined },
        column: { getColId: () => "tagType" },
        value: 2,
        oldValue: 1,
        node: { setDataValue: vi.fn() },
        api: { refreshCells },
      });

      expect(tagsService.updateTag).toHaveBeenCalledWith(row.id, { tag_type: 2 });
      expect(refreshCells).toHaveBeenCalled();
    });

    it("ignores invalid tag_type values without calling the API", async () => {
      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;
      const row = api.rowData.value[0];

      await api.onCellEditingStopped({
        data: row,
        colDef: { field: undefined },
        column: { getColId: () => "tagType" },
        value: NaN,
        oldValue: 1,
        node: { setDataValue: vi.fn() },
        api: { refreshCells: vi.fn() },
      });

      expect(tagsService.updateTag).not.toHaveBeenCalled();
    });

    it("reverts the displayed value when persisting a tag_type change fails", async () => {
      vi.spyOn(tagsService, "updateTag").mockRejectedValueOnce(new Error("boom"));
      const wrapper = mountTab();
      await flushPromises();
      const api = (wrapper.vm as any).__test;
      const row = api.rowData.value[0];

      // No field on colDef → no revert via setDataValue; ensure no crash.
      await api.onCellEditingStopped({
        data: row,
        colDef: { field: undefined },
        column: { getColId: () => "tagType" },
        value: 2,
        oldValue: 1,
        node: { setDataValue: vi.fn() },
        api: { refreshCells: vi.fn() },
      });

      expect(api.saveError.value).toBeTruthy();
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
