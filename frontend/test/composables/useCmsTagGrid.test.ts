import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import type { TagType } from "@viernulvier/shared";
import { useCmsTagGrid } from "@/composables/useCmsTagGrid";

describe("useCmsTagGrid", () => {
  it("declares the tag column definitions", () => {
    const { columnDefs } = useCmsTagGrid({
      isDark: ref(false),
      t: (key) => key,
      getTagTypes: () => [],
      localize: () => "",
      onCreateTagTypeRequest: () => {},
    });

    expect(columnDefs.value).toHaveLength(4);

    const name = columnDefs.value.find((c) => c.field === "name");
    const tagType = columnDefs.value.find((c) => c.colId === "tagType");
    const publicField = columnDefs.value.find((c) => c.field === "public");
    const productionCount = columnDefs.value.find((c) => c.field === "productionCount");

    expect(name?.editable).toBe(true);
    expect(name?.flex).toBe(1);
    expect(tagType?.editable).toBe(true);
    expect(tagType?.cellEditorPopup).toBe(true);
    expect(tagType?.singleClickEdit).toBe(true);
    expect(publicField?.editable).toBe(true);
    expect(publicField?.cellEditor).toBe("agCheckboxCellEditor");
    expect(productionCount?.editable).toBe(false);
    expect(productionCount?.filter).toBe("agNumberColumnFilter");
  });

  it("tagType column exposes a valueGetter and valueFormatter tied to the row", () => {
    const { columnDefs } = useCmsTagGrid({
      isDark: ref(false),
      t: (key) => key,
      getTagTypes: () => [],
      localize: () => "",
      onCreateTagTypeRequest: () => {},
    });
    const tagType = columnDefs.value.find((c) => c.colId === "tagType");
    const row = { id: 1, source: {}, name: "Drama", tagTypeId: 42, tagType: "Genre", public: true, productionCount: 0 };

    expect(typeof tagType?.valueGetter).toBe("function");
    expect((tagType?.valueGetter as (p: { data: typeof row }) => unknown)({ data: row })).toBe(42);
    expect(
      (tagType?.valueFormatter as (p: { data: typeof row }) => string)({ data: row }),
    ).toBe("Genre");
    expect(
      (tagType?.filterValueGetter as (p: { data: typeof row }) => string)({ data: row }),
    ).toBe("Genre");
  });

  it("valueGetter / valueFormatter / filterValueGetter handle missing row data", () => {
    const { columnDefs } = useCmsTagGrid({
      isDark: ref(false),
      t: (key) => key,
      getTagTypes: () => [],
      localize: () => "",
      onCreateTagTypeRequest: () => {},
    });
    const tagType = columnDefs.value.find((c) => c.colId === "tagType");

    expect((tagType?.valueGetter as (p: { data?: undefined }) => unknown)({})).toBeNull();
    expect((tagType?.valueFormatter as (p: { data?: undefined }) => string)({})).toBe("");
    expect((tagType?.filterValueGetter as (p: { data?: undefined }) => string)({})).toBe("");
  });

  it("cellEditorParams forwards picker dependencies via the options closure", () => {
    const types: TagType[] = [{ id: 7, old_id: null, name: { en: "Workshop" } } as TagType];
    const onCreateTagTypeRequest = vi.fn();
    const localize = vi.fn(() => "Workshop");
    const { columnDefs } = useCmsTagGrid({
      isDark: ref(false),
      t: (key) => key,
      getTagTypes: () => types,
      localize,
      onCreateTagTypeRequest,
    });
    const tagType = columnDefs.value.find((c) => c.colId === "tagType");
    const params = (tagType?.cellEditorParams as () => Record<string, unknown>)();
    expect(params.tagTypes).toEqual(types);
    expect(params.localize).toBe(localize);
    expect(params.onCreateRequest).toBe(onCreateTagTypeRequest);
  });

  it("builds translated column options", () => {
    const { gridColumnOptions } = useCmsTagGrid({
      isDark: ref(false),
      t: (key) => key,
      getTagTypes: () => [],
      localize: () => "",
      onCreateTagTypeRequest: () => {},
    });

    expect(gridColumnOptions.value).toEqual([
      { colId: "name", label: "cms.columns.tagName" },
      { colId: "tagType", label: "cms.columns.tagType" },
      { colId: "public", label: "cms.columns.public" },
      { colId: "productionCount", label: "cms.columns.productionCount" },
    ]);
  });

  it("exposes a pinned selection column definition", () => {
    const { selectionColumnDef } = useCmsTagGrid({
      isDark: ref(false),
      t: (key) => key,
      getTagTypes: () => [],
      localize: () => "",
      onCreateTagTypeRequest: () => {},
    });

    expect(selectionColumnDef.width).toBe(48);
    expect(selectionColumnDef.pinned).toBe("left");
    expect(selectionColumnDef.resizable).toBe(false);
  });

  it("provides a non-editable defaultColDef with floating filter", () => {
    const { defaultColDef } = useCmsTagGrid({
      isDark: ref(false),
      t: (key) => key,
      getTagTypes: () => [],
      localize: () => "",
      onCreateTagTypeRequest: () => {},
    });

    expect(defaultColDef.editable).toBe(false);
    expect(defaultColDef.sortable).toBe(true);
    expect(defaultColDef.floatingFilter).toBe(true);
  });
});
