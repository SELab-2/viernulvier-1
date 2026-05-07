import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useCmsTagGrid } from "@/composables/useCmsTagGrid";

describe("useCmsTagGrid", () => {
  it("declares the tag column definitions", () => {
    const { columnDefs } = useCmsTagGrid({ isDark: ref(false), t: (key) => key });

    expect(columnDefs.value).toHaveLength(4);

    const name = columnDefs.value.find((c) => c.field === "name");
    const tagType = columnDefs.value.find((c) => c.field === "tagType");
    const publicField = columnDefs.value.find((c) => c.field === "public");
    const productionCount = columnDefs.value.find((c) => c.field === "productionCount");

    expect(name?.editable).toBe(true);
    expect(name?.flex).toBe(1);
    expect(tagType?.editable).toBe(false);
    expect(publicField?.editable).toBe(true);
    expect(publicField?.cellEditor).toBe("agCheckboxCellEditor");
    expect(productionCount?.editable).toBe(false);
    expect(productionCount?.filter).toBe("agNumberColumnFilter");
  });

  it("builds translated column options", () => {
    const { gridColumnOptions } = useCmsTagGrid({ isDark: ref(false), t: (key) => key });

    expect(gridColumnOptions.value).toEqual([
      { colId: "name", label: "cms.columns.tagName" },
      { colId: "tagType", label: "cms.columns.tagType" },
      { colId: "public", label: "cms.columns.public" },
      { colId: "productionCount", label: "cms.columns.productionCount" },
    ]);
  });

  it("exposes a pinned selection column definition", () => {
    const { selectionColumnDef } = useCmsTagGrid({ isDark: ref(false), t: (key) => key });

    expect(selectionColumnDef.width).toBe(48);
    expect(selectionColumnDef.pinned).toBe("left");
    expect(selectionColumnDef.resizable).toBe(false);
  });

  it("provides a non-editable defaultColDef with floating filter", () => {
    const { defaultColDef } = useCmsTagGrid({ isDark: ref(false), t: (key) => key });

    expect(defaultColDef.editable).toBe(false);
    expect(defaultColDef.sortable).toBe(true);
    expect(defaultColDef.floatingFilter).toBe(true);
  });
});
