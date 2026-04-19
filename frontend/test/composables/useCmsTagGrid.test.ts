import { describe, expect, it, vi, beforeEach } from "vitest";
import { ref } from "vue";
import type { GridReadyEvent, SelectionChangedEvent } from "ag-grid-community";
import { useCmsTagGrid } from "@/composables/useCmsTagGrid";

function createGridApiMock() {
  return {
    getState: vi.fn(() => ({ foo: "bar" })),
    setState: vi.fn(),
    getColumnState: vi.fn(() => [
      { colId: "name", hide: false },
      { colId: "public", hide: true },
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

describe("useCmsTagGrid", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("initializes defaults and builds column definitions", () => {
    const grid = useCmsTagGrid({ isDark: ref(false), t: (key) => key });

    expect(grid.quickFilterText.value).toBe("");
    expect(grid.selectedCount.value).toBe(0);
    expect(grid.columnDefs.value).toHaveLength(4);
    expect(grid.gridColumnOptions.value).toHaveLength(4);
    expect(grid.defaultColDef.editable).toBe(false);
    expect(grid.rowSelection.mode).toBe("multiRow");
    expect(grid.selectionColumnDef.width).toBe(48);

    const nameCol = grid.columnDefs.value.find((d) => d.field === "name");
    expect(nameCol?.flex).toBe(1);
    expect(nameCol?.editable).toBe(true);

    const publicCol = grid.columnDefs.value.find((d) => d.field === "public");
    expect(publicCol?.cellEditor).toBe("agCheckboxCellEditor");
  });

  it("returns dark and light theme variables", () => {
    const isDark = ref(false);
    const grid = useCmsTagGrid({ isDark, t: (key) => key });

    expect(grid.agThemeVars.value["--cms-header-fg"]).toBe("var(--ink-primary)");
    isDark.value = true;
    expect(grid.agThemeVars.value["--cms-header-fg"]).toBe("var(--ink-on-inv)");
  });

  it("restores state and always fits columns on grid ready", () => {
    const api = createGridApiMock();
    localStorage.setItem("viernulvier-cms-tag-grid-state", JSON.stringify({ columns: [] }));

    const grid = useCmsTagGrid({ isDark: ref(false), t: (key) => key });
    grid.onGridReady({ api } as unknown as GridReadyEvent);

    expect(api.setState).toHaveBeenCalled();
    expect(api.sizeColumnsToFit).toHaveBeenCalled();
    expect(grid.columnVisibility.value.public).toBe(false);
  });

  it("fits columns on grid ready when no persisted state exists", () => {
    const api = createGridApiMock();
    const grid = useCmsTagGrid({ isDark: ref(false), t: (key) => key });

    grid.onGridReady({ api } as unknown as GridReadyEvent);

    expect(api.setState).not.toHaveBeenCalled();
    expect(api.sizeColumnsToFit).toHaveBeenCalled();
  });

  it("ignores invalid persisted JSON and still fits", () => {
    const api = createGridApiMock();
    localStorage.setItem("viernulvier-cms-tag-grid-state", "{bad-json");

    const grid = useCmsTagGrid({ isDark: ref(false), t: (key) => key });
    grid.onGridReady({ api } as unknown as GridReadyEvent);

    expect(api.setState).not.toHaveBeenCalled();
    expect(api.sizeColumnsToFit).toHaveBeenCalled();
  });

  it("updates column visibility and persists state", () => {
    const api = createGridApiMock();
    const grid = useCmsTagGrid({ isDark: ref(false), t: (key) => key });
    grid.gridApi.value = api as never;

    grid.setGridColumnVisibility("public", false);

    expect(api.applyColumnState).toHaveBeenCalledWith({ state: [{ colId: "public", hide: true }] });
    expect(grid.columnVisibility.value.public).toBe(false);
    expect(localStorage.getItem("viernulvier-cms-tag-grid-state")).toContain("foo");
  });

  it("can re-show a hidden column", () => {
    const api = createGridApiMock();
    const grid = useCmsTagGrid({ isDark: ref(false), t: (key) => key });
    grid.gridApi.value = api as never;

    grid.setGridColumnVisibility("public", true);

    expect(api.applyColumnState).toHaveBeenCalledWith({ state: [{ colId: "public", hide: false }] });
    expect(grid.columnVisibility.value.public).toBe(true);
  });

  it("handles fit, autosize, filters and quick filter application", () => {
    const api = createGridApiMock();
    const grid = useCmsTagGrid({ isDark: ref(false), t: (key) => key });
    grid.gridApi.value = api as never;

    grid.fitGridColumns();
    grid.autoSizeGridColumns();
    grid.quickFilterText.value = "needle";
    grid.applyQuickFilter();
    grid.resetGridFilters();

    expect(api.sizeColumnsToFit).toHaveBeenCalled();
    expect(api.autoSizeAllColumns).toHaveBeenCalled();
    expect(api.setGridOption).toHaveBeenCalledWith("quickFilterText", "needle");
    expect(api.setFilterModel).toHaveBeenCalledWith(null);
    expect(grid.quickFilterText.value).toBe("");
  });

  it("exports CSV excluding hidden columns", () => {
    const api = createGridApiMock();
    const grid = useCmsTagGrid({ isDark: ref(false), t: (key) => key });
    grid.gridApi.value = api as never;
    grid.columnVisibility.value = { ...grid.columnVisibility.value, public: false };

    grid.exportGridCsv();

    const exportArg = api.exportDataAsCsv.mock.calls[0]?.[0];
    expect(exportArg.fileName).toBe("cms-tags.csv");
    expect(exportArg.columnKeys).not.toContain("public");
    expect(exportArg.columnKeys).toContain("name");
  });

  it("resets grid state and clears persisted storage", () => {
    localStorage.setItem("viernulvier-cms-tag-grid-state", JSON.stringify({ a: 1 }));
    const api = createGridApiMock();
    const grid = useCmsTagGrid({ isDark: ref(false), t: (key) => key });
    grid.gridApi.value = api as never;
    grid.quickFilterText.value = "x";
    grid.columnChooserOpen.value = true;

    grid.resetGridState();

    expect(api.deselectAll).toHaveBeenCalled();
    expect(api.setFilterModel).toHaveBeenCalledWith(null);
    expect(api.applyColumnState).toHaveBeenCalledWith({ defaultState: { sort: null } });
    expect(api.applyColumnState).toHaveBeenCalledWith({ defaultState: { hide: false } });
    expect(grid.quickFilterText.value).toBe("");
    expect(grid.selectedCount.value).toBe(0);
    expect(grid.columnChooserOpen.value).toBe(false);
    expect(grid.columnVisibility.value.name).toBe(true);
  });

  it("updates selection count on selection change", () => {
    const api = createGridApiMock();
    api.getSelectedRows.mockReturnValue([{ id: 1 }, { id: 2 }]);

    const grid = useCmsTagGrid({ isDark: ref(false), t: (key) => key });
    grid.onSelectionChanged({ api } as unknown as SelectionChangedEvent);

    expect(grid.selectedCount.value).toBe(2);
  });

  it("is safe to call sync and persist helpers without a grid api", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    const grid = useCmsTagGrid({ isDark: ref(false), t: (key) => key });

    grid.syncColumnVisibilityFromGrid();
    grid.persistGridState();

    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it("resets local state even without a grid api", () => {
    localStorage.setItem("viernulvier-cms-tag-grid-state", JSON.stringify({ a: 1 }));
    const grid = useCmsTagGrid({ isDark: ref(false), t: (key) => key });
    grid.quickFilterText.value = "abc";
    grid.columnChooserOpen.value = true;

    grid.resetGridState();

    expect(grid.quickFilterText.value).toBe("");
    expect(grid.columnChooserOpen.value).toBe(false);
    expect(localStorage.getItem("viernulvier-cms-tag-grid-state")).toBeNull();
  });
});
