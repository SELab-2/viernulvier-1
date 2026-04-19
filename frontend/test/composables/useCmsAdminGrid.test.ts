import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useCmsAdminGrid } from "@/composables/useCmsAdminGrid";

const t = (key: string) => key;
const isDark = ref(false);

function makeComposable() {
  return useCmsAdminGrid({ isDark, t });
}

describe("useCmsAdminGrid", () => {
  describe("initial state", () => {
    it("has empty quick filter text", () => {
      const { quickFilterText } = makeComposable();
      expect(quickFilterText.value).toBe("");
    });

    it("has zero selected count", () => {
      const { selectedCount } = makeComposable();
      expect(selectedCount.value).toBe(0);
    });

    it("has column chooser closed", () => {
      const { columnChooserOpen } = makeComposable();
      expect(columnChooserOpen.value).toBe(false);
    });

    it("has all columns visible", () => {
      const { columnVisibility } = makeComposable();
      expect(columnVisibility.value).toEqual({
        username: true,
        profilePicture: true,
        isSuper: true,
      });
    });
  });

  describe("columnDefs", () => {
    it("returns three column definitions", () => {
      const { columnDefs } = makeComposable();
      expect(columnDefs.value).toHaveLength(3);
    });

    it("username column is editable", () => {
      const { columnDefs } = makeComposable();
      const col = columnDefs.value.find((c) => c.field === "username");
      expect(col?.editable).toBe(true);
    });

    it("profilePicture column is not editable", () => {
      const { columnDefs } = makeComposable();
      const col = columnDefs.value.find((c) => c.field === "profilePicture");
      expect(col?.editable).toBe(false);
    });

    it("isSuper column is editable", () => {
      const { columnDefs } = makeComposable();
      const col = columnDefs.value.find((c) => c.field === "super");
      expect(col?.editable).toBe(true);
    });

    it("uses checkbox editor and renderer for isSuper", () => {
      const { columnDefs } = makeComposable();
      const col = columnDefs.value.find((c) => c.field === "super");
      expect(col?.cellEditor).toBe("agCheckboxCellEditor");
      expect(col?.cellRenderer).toBe("agCheckboxCellRenderer");
    });
  });

  describe("gridColumnOptions", () => {
    it("returns an option for each column", () => {
      const { gridColumnOptions } = makeComposable();
      expect(gridColumnOptions.value).toHaveLength(3);
    });

    it("uses translation keys as labels", () => {
      const { gridColumnOptions } = makeComposable();
      const colIds = gridColumnOptions.value.map((o) => o.colId);
      expect(colIds).toEqual(["username", "profilePicture", "isSuper"]);
    });
  });

  describe("setGridColumnVisibility", () => {
    it("updates columnVisibility when hiding a column", () => {
      const { setGridColumnVisibility, columnVisibility } = makeComposable();
      setGridColumnVisibility("username", false);
      expect(columnVisibility.value.username).toBe(false);
    });

    it("updates columnVisibility when showing a column", () => {
      const { setGridColumnVisibility, columnVisibility } = makeComposable();
      setGridColumnVisibility("username", false);
      setGridColumnVisibility("username", true);
      expect(columnVisibility.value.username).toBe(true);
    });
  });

  describe("resetGridState", () => {
    it("resets quickFilterText", () => {
      const { quickFilterText, resetGridState } = makeComposable();
      quickFilterText.value = "some filter";
      resetGridState();
      expect(quickFilterText.value).toBe("");
    });

    it("resets selectedCount", () => {
      const { selectedCount, resetGridState } = makeComposable();
      selectedCount.value = 5;
      resetGridState();
      expect(selectedCount.value).toBe(0);
    });

    it("resets columnChooserOpen", () => {
      const { columnChooserOpen, resetGridState } = makeComposable();
      columnChooserOpen.value = true;
      resetGridState();
      expect(columnChooserOpen.value).toBe(false);
    });

    it("resets all columns to visible", () => {
      const { setGridColumnVisibility, columnVisibility, resetGridState } = makeComposable();
      setGridColumnVisibility("username", false);
      setGridColumnVisibility("isSuper", false);
      resetGridState();
      expect(columnVisibility.value).toEqual({
        username: true,
        profilePicture: true,
        isSuper: true,
      });
    });
  });

  describe("agThemeVars", () => {
    it("returns light theme vars when isDark is false", () => {
      const { agThemeVars } = makeComposable();
      expect(agThemeVars.value["--ag-header-background-color"]).toBe("var(--surface-1)");
    });

    it("returns dark theme vars when isDark is true", () => {
      isDark.value = true;
      const { agThemeVars } = makeComposable();
      expect(agThemeVars.value["--ag-header-background-color"]).toBe("var(--surface-inv-raised)");
      isDark.value = false;
    });

    it("always sets the correct font family", () => {
      const { agThemeVars } = makeComposable();
      expect(agThemeVars.value["--ag-font-family"]).toBe('"Inter Variable", sans-serif');
    });
  });
});