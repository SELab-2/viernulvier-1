import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useCmsAdminGrid } from "@/composables/useCmsAdminGrid";

describe("useCmsAdminGrid", () => {
  it("declares the admin column definitions", () => {
    const { columnDefs } = useCmsAdminGrid({ isDark: ref(false), t: (key) => key });

    expect(columnDefs.value).toHaveLength(2);

    const username = columnDefs.value.find((c) => c.field === "username");
    const superField = columnDefs.value.find((c) => c.field === "super");

    expect(username?.editable).toBe(true);
    expect(username?.flex).toBe(1);
    expect(superField?.editable).toBe(true);
    expect(superField?.cellEditor).toBe("agCheckboxCellEditor");
    expect(superField?.cellRenderer).toBe("agCheckboxCellRenderer");
  });

  it("builds translated column options", () => {
    const { gridColumnOptions } = useCmsAdminGrid({ isDark: ref(false), t: (key) => key });

    expect(gridColumnOptions.value).toEqual([
      { colId: "username", label: "cms.columns.admin.username" },
      { colId: "super", label: "cms.columns.admin.super" },
    ]);
  });

  it("exposes a pinned selection column definition", () => {
    const { selectionColumnDef } = useCmsAdminGrid({ isDark: ref(false), t: (key) => key });

    expect(selectionColumnDef.width).toBe(48);
    expect(selectionColumnDef.pinned).toBe("left");
    expect(selectionColumnDef.resizable).toBe(false);
  });

  it("provides a non-editable defaultColDef with floating filter", () => {
    const { defaultColDef } = useCmsAdminGrid({ isDark: ref(false), t: (key) => key });

    expect(defaultColDef.editable).toBe(false);
    expect(defaultColDef.sortable).toBe(true);
    expect(defaultColDef.floatingFilter).toBe(true);
  });
});
