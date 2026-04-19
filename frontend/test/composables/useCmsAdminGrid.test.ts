import { describe, expect, it, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { useCmsAdminGrid } from "@/composables/useCmsAdminGrid";
import type { GridApi } from "ag-grid-community";

const t = (key: string) => key;
let isDark = ref(false);

function makeComposable() {
  return useCmsAdminGrid({ isDark, t });
}

function createGridApiMock() {
  return {
    getState: vi.fn(() => ({ foo: "bar" })),
    setState: vi.fn(),
    getColumnState: vi.fn(() => [
      { colId: "username", hide: false },
      { colId: "profilePicture", hide: true },
      { colId: "super", hide: false },
    ]),
    applyColumnState: vi.fn(),
    sizeColumnsToFit: vi.fn(),
    autoSizeAllColumns: vi.fn(),
    setFilterModel: vi.fn(),
    setGridOption: vi.fn(),
    getSelectedRows: vi.fn(() => [{ id: 1 }]),
    exportDataAsCsv: vi.fn(),
    deselectAll: vi.fn(),
  };
}

function asGridApi(api: any) {
  return api as unknown as GridApi<any>;
}

describe("useCmsAdminGrid", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    isDark.value = false;
  });

  describe("initial state", () => {
    it("has correct defaults", () => {
      const {
        quickFilterText,
        selectedCount,
        columnChooserOpen,
        columnVisibility,
      } = makeComposable();

      expect(quickFilterText.value).toBe("");
      expect(selectedCount.value).toBe(0);
      expect(columnChooserOpen.value).toBe(false);
      expect(columnVisibility.value).toEqual({
        username: true,
        profilePicture: true,
        super: true,
      });
    });
  });

  describe("column configuration", () => {
    it("defines correct columns", () => {
      const { columnDefs } = makeComposable();

      expect(columnDefs.value).toHaveLength(3);

      const username = columnDefs.value.find(c => c.field === "username");
      const profile = columnDefs.value.find(c => c.field === "profilePicture");
      const superField = columnDefs.value.find(c => c.field === "super");

      expect(username?.editable).toBe(true);
      expect(profile?.editable).toBe(false);
      expect(superField?.editable).toBe(true);
      expect(superField?.cellEditor).toBe("agCheckboxCellEditor");
      expect(superField?.cellRenderer).toBe("agCheckboxCellRenderer");
    });

    it("builds column options with translations", () => {
      const { gridColumnOptions } = makeComposable();

      expect(gridColumnOptions.value).toEqual([
        { colId: "username", label: "cms.columns.admin.username" },
        { colId: "profilePicture", label: "cms.columns.admin.profilePicture" },
        { colId: "super", label: "cms.columns.admin.super" },
      ]);
    });

    it("renders profile picture link when value exists", () => {
      const { columnDefs } = makeComposable();

      const col = columnDefs.value.find(c => c.field === "profilePicture");
      const renderer = col?.cellRenderer as Function;

      const result = renderer({ value: "https://example.com/pic.jpg" });

      expect(result).toContain('<a href="https://example.com/pic.jpg"');
    });

    it("renders dash when no profile picture", () => {
      const { columnDefs } = makeComposable();

      const col = columnDefs.value.find(c => c.field === "profilePicture");
      const renderer = col?.cellRenderer as Function;

      expect(renderer({ value: null })).toBe("-");
    });
  });

  describe("grid lifecycle", () => {
    it("initializes grid and restores state", () => {
      const api = createGridApiMock();
      const { onGridReady, gridApi } = makeComposable();

      localStorage.setItem(
        "viernulvier-cms-admin-grid-state",
        JSON.stringify({ test: 1 }),
      );

      onGridReady({ api } as any);

      expect(gridApi.value).toEqual(api);
      expect(api.setState).toHaveBeenCalled();
      expect(api.sizeColumnsToFit).toHaveBeenCalled();
    });

    it("skips restore if no state exists", () => {
      const api = createGridApiMock();
      const { onGridReady } = makeComposable();

      onGridReady({ api } as any);

      expect(api.setState).not.toHaveBeenCalled();
    });
  });

  describe("filtering", () => {
    it("applies quick filter", () => {
      const api = createGridApiMock();
      const { applyQuickFilter, quickFilterText, gridApi } = makeComposable();

      gridApi.value = asGridApi(api);
      quickFilterText.value = "john";

      applyQuickFilter();

      expect(api.setGridOption).toHaveBeenCalledWith("quickFilterText", "john");
    });

    it("resets filters", () => {
      const api = createGridApiMock();
      const { resetGridFilters, quickFilterText, gridApi } = makeComposable();

      gridApi.value = asGridApi(api);
      quickFilterText.value = "abc";

      resetGridFilters();

      expect(quickFilterText.value).toBe("");
      expect(api.setFilterModel).toHaveBeenCalledWith(null);
      expect(api.setGridOption).toHaveBeenCalled();
    });
  });

  describe("column visibility", () => {
    it("updates visibility and applies to grid", () => {
      const api = createGridApiMock();
      const { setGridColumnVisibility, columnVisibility, gridApi } = makeComposable();

      gridApi.value = asGridApi(api);

      setGridColumnVisibility("username", false);

      expect(columnVisibility.value.username).toBe(false);
      expect(api.applyColumnState).toHaveBeenCalledWith({
        state: [{ colId: "username", hide: true }],
      });
      expect(api.sizeColumnsToFit).toHaveBeenCalled();
    });

    it("syncs visibility from grid", () => {
      const api = createGridApiMock();
      const { syncColumnVisibilityFromGrid, columnVisibility, gridApi } = makeComposable();

      gridApi.value = asGridApi(api);

      syncColumnVisibilityFromGrid();

      expect(columnVisibility.value).toEqual({
        username: true,
        profilePicture: false,
        super: true,
      });
    });

    it("handles missing gridApi when syncing column visibility", () => {
      const { syncColumnVisibilityFromGrid, columnVisibility } = makeComposable();

      // gridApi is null by default
      syncColumnVisibilityFromGrid();

      expect(columnVisibility.value).toEqual({
        username: true,
        profilePicture: true,
        super: true,
      });
    });
  });

  describe("selection", () => {
    it("updates selected count", () => {
      const api = createGridApiMock();
      api.getSelectedRows.mockReturnValue([{id: 0}, {id: 1}, {id: 2}]);

      const { onSelectionChanged, selectedCount } = makeComposable();

      onSelectionChanged({ api } as any);

      expect(selectedCount.value).toBe(3);
    });
  });

  describe("export", () => {
    it("exports only visible columns", () => {
      const api = createGridApiMock();
      const { exportGridCsv, columnVisibility, gridApi } = makeComposable();

      gridApi.value = asGridApi(api);
      columnVisibility.value.profilePicture = false;

      exportGridCsv();

      expect(api.exportDataAsCsv).toHaveBeenCalledWith(
        expect.objectContaining({
          columnKeys: ["username", "super"],
        }),
      );
    });
  });

  describe("reset state", () => {
    it("fully resets grid state", () => {
      const api = createGridApiMock();
      const {
        resetGridState,
        quickFilterText,
        selectedCount,
        columnChooserOpen,
        columnVisibility,
        gridApi,
      } = makeComposable();

      gridApi.value = asGridApi(api);

      quickFilterText.value = "x";
      selectedCount.value = 5;
      columnChooserOpen.value = true;
      columnVisibility.value.username = false;

      resetGridState();

      expect(quickFilterText.value).toBe("");
      expect(selectedCount.value).toBe(0);
      expect(columnChooserOpen.value).toBe(false);
      expect(columnVisibility.value).toEqual({
        username: true,
        profilePicture: true,
        super: true,
      });

      expect(api.deselectAll).toHaveBeenCalled();
      expect(api.setFilterModel).toHaveBeenCalledWith(null);
      expect(api.applyColumnState).toHaveBeenCalled();
    });
  });

  describe("grid columns controls", () => {
    it("fits grid columns", () => {
      const api = createGridApiMock();
      const { fitGridColumns, gridApi } = makeComposable();

      gridApi.value = api as any;

      fitGridColumns();

      expect(api.sizeColumnsToFit).toHaveBeenCalled();
    });

    it("auto sizes grid columns", () => {
      const api = createGridApiMock();
      const { autoSizeGridColumns, gridApi } = makeComposable();

      gridApi.value = api as any;

      autoSizeGridColumns();

      expect(api.autoSizeAllColumns).toHaveBeenCalled();
    });
  });

  describe("theme", () => {
    it("returns light theme", () => {
      const { agThemeVars } = makeComposable();

      expect(agThemeVars.value["--ag-header-background-color"]).toBe("var(--surface-1)");
    });

    it("returns dark theme", () => {
      isDark.value = true;

      const { agThemeVars } = makeComposable();

      expect(agThemeVars.value["--ag-header-background-color"]).toBe(
        "var(--surface-inv-raised)",
      );
    });

    it("always includes font family", () => {
      const { agThemeVars } = makeComposable();

      expect(agThemeVars.value["--ag-font-family"]).toBe('"Inter Variable", sans-serif');
    });
  });

  describe("persistence", () => {
    it("persists grid state", () => {
      const api = createGridApiMock();
      const { persistGridState, gridApi } = makeComposable();

      gridApi.value = asGridApi(api);

      persistGridState();

      expect(localStorage.getItem("viernulvier-cms-admin-grid-state")).toBeTruthy();
    });

    it("does not persist when gridApi is null", () => {
      const { persistGridState } = makeComposable();

      persistGridState();

      expect(localStorage.getItem("viernulvier-cms-admin-grid-state")).toBe(null);
    });
  });
});