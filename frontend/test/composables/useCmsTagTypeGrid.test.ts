import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useCmsTagTypeGrid } from "@/composables/useCmsTagTypeGrid";

describe("useCmsTagTypeGrid", () => {
  it("declares the expected column definitions", () => {
    const { columnDefs } = useCmsTagTypeGrid({ isDark: ref(false), t: (key) => key });

    expect(columnDefs.value).toHaveLength(4);

    const id = columnDefs.value.find((c) => c.field === "id");
    const name = columnDefs.value.find((c) => c.field === "name");
    const tagCount = columnDefs.value.find((c) => c.field === "tagCount");
    const tags = columnDefs.value.find((c) => c.field === "tags");

    expect(id).toBeDefined();
    expect(name).toBeDefined();
    expect(tagCount).toBeDefined();
    expect(tags).toBeDefined();
  });

  it("id column is non-editable with number filter", () => {
    const { columnDefs } = useCmsTagTypeGrid({ isDark: ref(false), t: (key) => key });

    const id = columnDefs.value.find((c) => c.field === "id");
    expect(id?.editable).toBe(false);
    expect(id?.filter).toBe("agNumberColumnFilter");
    expect(id?.maxWidth).toBe(100);
  });

  it("name column is non-editable and stretches (flex 1)", () => {
    const { columnDefs } = useCmsTagTypeGrid({ isDark: ref(false), t: (key) => key });

    const name = columnDefs.value.find((c) => c.field === "name");
    expect(name?.editable).toBe(false);
    expect(name?.flex).toBe(1);
  });

  it("tagCount column is non-editable with number filter", () => {
    const { columnDefs } = useCmsTagTypeGrid({ isDark: ref(false), t: (key) => key });

    const tagCount = columnDefs.value.find((c) => c.field === "tagCount");
    expect(tagCount?.editable).toBe(false);
    expect(tagCount?.filter).toBe("agNumberColumnFilter");
  });

  it("tags column value formatter renders empty array as dash", () => {
    const { columnDefs } = useCmsTagTypeGrid({ isDark: ref(false), t: (key) => key });

    const tags = columnDefs.value.find((c) => c.field === "tags");
    const fmt = tags?.valueFormatter;
    expect(typeof fmt).toBe("function");
    const result = (fmt as Function)({ value: [] });
    expect(result).toBe("-");
  });

  it("tags column value formatter joins ids with comma", () => {
    const { columnDefs } = useCmsTagTypeGrid({ isDark: ref(false), t: (key) => key });

    const tags = columnDefs.value.find((c) => c.field === "tags");
    const fmt = tags?.valueFormatter as Function;
    expect(fmt({ value: [1, 2, 3] })).toBe("1, 2, 3");
  });

  it("tags column value formatter handles non-array value as dash", () => {
    const { columnDefs } = useCmsTagTypeGrid({ isDark: ref(false), t: (key) => key });

    const tags = columnDefs.value.find((c) => c.field === "tags");
    const fmt = tags?.valueFormatter as Function;
    expect(fmt({ value: null })).toBe("-");
  });

  it("builds translated column options in canonical order", () => {
    const { gridColumnOptions } = useCmsTagTypeGrid({ isDark: ref(false), t: (key) => key });

    expect(gridColumnOptions.value).toEqual([
      { colId: "id", label: "cms.columns.id" },
      { colId: "name", label: "cms.columns.tagTypeName" },
      { colId: "tagCount", label: "cms.columns.tagCount" },
      { colId: "tags", label: "cms.columns.tagsInType" },
    ]);
  });

  it("exposes a pinned selection column definition", () => {
    const { selectionColumnDef } = useCmsTagTypeGrid({ isDark: ref(false), t: (key) => key });

    expect(selectionColumnDef.width).toBe(48);
    expect(selectionColumnDef.pinned).toBe("left");
    expect(selectionColumnDef.resizable).toBe(false);
  });

  it("provides a non-editable defaultColDef with floating filter", () => {
    const { defaultColDef } = useCmsTagTypeGrid({ isDark: ref(false), t: (key) => key });

    expect(defaultColDef.editable).toBe(false);
    expect(defaultColDef.sortable).toBe(true);
    expect(defaultColDef.floatingFilter).toBe(true);
    expect(defaultColDef.resizable).toBe(true);
  });
});
