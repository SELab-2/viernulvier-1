import { describe, expect, it, vi, beforeEach } from "vitest";
import { ref } from "vue";
import type { GridReadyEvent, SelectionChangedEvent } from "ag-grid-community";
import { useCmsGridBase } from "@/composables/useCmsGridBase";

const STORAGE_KEY = "viernulvier-cms-test-grid-state";
const COLUMN_IDS = ["one", "two", "three"] as const;

function createGridApiMock() {
  return {
    getState: vi.fn(() => ({ foo: "bar" })),
    setState: vi.fn(),
    getColumnState: vi.fn(() => [
      { colId: "one", hide: false },
      { colId: "two", hide: true },
      { colId: "three", hide: false },
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

function makeBase(overrides: Partial<Parameters<typeof useCmsGridBase>[0]> = {}) {
  return useCmsGridBase({
    isDark: ref(false),
    storageKey: STORAGE_KEY,
    columnIds: COLUMN_IDS,
    csvFileName: "test.csv",
    ...overrides,
  });
}

describe("useCmsGridBase", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("starts with empty selection and filter, all columns visible", () => {
      const base = makeBase();

      expect(base.quickFilterText.value).toBe("");
      expect(base.selectedCount.value).toBe(0);
      expect(base.columnChooserOpen.value).toBe(false);
      expect(base.columnVisibility.value).toEqual({ one: true, two: true, three: true });
      expect(base.gridApi.value).toBe(null);
    });

    it("exposes the multi-row selection config", () => {
      const base = makeBase();

      expect(base.rowSelection.mode).toBe("multiRow");
      expect(base.rowSelection.checkboxes).toBe(true);
      expect(base.rowSelection.headerCheckbox).toBe(true);
    });
  });

  describe("theme variables", () => {
    it("switches between light and dark variable sets", () => {
      const isDark = ref(false);
      const base = makeBase({ isDark });

      expect(base.agThemeVars.value["--ag-header-background-color"]).toBe("var(--surface-1)");
      expect(base.agThemeVars.value["--cms-header-fg"]).toBe("var(--ink-primary)");

      isDark.value = true;
      expect(base.agThemeVars.value["--ag-header-background-color"]).toBe("var(--surface-inv-raised)");
      expect(base.agThemeVars.value["--cms-header-fg"]).toBe("var(--ink-on-inv)");
    });

    it("always includes the shared font configuration", () => {
      const base = makeBase();

      expect(base.agThemeVars.value["--ag-font-family"]).toBe('"Inter Variable", sans-serif');
      expect(base.agThemeVars.value["--ag-font-size"]).toBe("13px");
    });
  });

  describe("grid lifecycle (onGridReady)", () => {
    it("restores persisted state without re-fitting columns by default", () => {
      const api = createGridApiMock();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ a: 1 }));
      const base = makeBase();

      base.onGridReady({ api } as unknown as GridReadyEvent);

      expect(api.setState).toHaveBeenCalled();
      expect(api.sizeColumnsToFit).not.toHaveBeenCalled();
      expect(base.columnVisibility.value.two).toBe(false);
    });

    it("fits columns after restore when fitOnReadyAfterRestore is set", () => {
      const api = createGridApiMock();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ a: 1 }));
      const base = makeBase({ fitOnReadyAfterRestore: true });

      base.onGridReady({ api } as unknown as GridReadyEvent);

      expect(api.setState).toHaveBeenCalled();
      expect(api.sizeColumnsToFit).toHaveBeenCalled();
    });

    it("fits columns when there is no persisted state", () => {
      const api = createGridApiMock();
      const base = makeBase();

      base.onGridReady({ api } as unknown as GridReadyEvent);

      expect(api.setState).not.toHaveBeenCalled();
      expect(api.sizeColumnsToFit).toHaveBeenCalled();
    });

    it("ignores invalid JSON in persisted state and still fits", () => {
      const api = createGridApiMock();
      localStorage.setItem(STORAGE_KEY, "{not-valid-json");
      const base = makeBase();

      base.onGridReady({ api } as unknown as GridReadyEvent);

      expect(api.setState).not.toHaveBeenCalled();
      expect(api.sizeColumnsToFit).toHaveBeenCalled();
    });
  });

  describe("filtering", () => {
    it("applies quick filter and persists", () => {
      const api = createGridApiMock();
      const base = makeBase();
      base.gridApi.value = api as never;

      base.quickFilterText.value = "needle";
      base.applyQuickFilter();

      expect(api.setGridOption).toHaveBeenCalledWith("quickFilterText", "needle");
    });

    it("resets filters by clearing quick filter and filter model", () => {
      const api = createGridApiMock();
      const base = makeBase();
      base.gridApi.value = api as never;
      base.quickFilterText.value = "abc";

      base.resetGridFilters();

      expect(base.quickFilterText.value).toBe("");
      expect(api.setFilterModel).toHaveBeenCalledWith(null);
    });
  });

  describe("column visibility", () => {
    it("updates a column's visibility and pushes it to the grid", () => {
      const api = createGridApiMock();
      const base = makeBase();
      base.gridApi.value = api as never;

      base.setGridColumnVisibility("two", false);

      expect(base.columnVisibility.value.two).toBe(false);
      expect(api.applyColumnState).toHaveBeenCalledWith({ state: [{ colId: "two", hide: true }] });
      expect(api.sizeColumnsToFit).toHaveBeenCalled();
    });

    it("can re-show a previously hidden column", () => {
      const api = createGridApiMock();
      const base = makeBase();
      base.gridApi.value = api as never;

      base.setGridColumnVisibility("two", true);

      expect(base.columnVisibility.value.two).toBe(true);
      expect(api.applyColumnState).toHaveBeenCalledWith({ state: [{ colId: "two", hide: false }] });
    });

    it("syncs visibility from grid column state", () => {
      const api = createGridApiMock();
      const base = makeBase();
      base.gridApi.value = api as never;

      base.syncColumnVisibilityFromGrid();

      expect(base.columnVisibility.value).toEqual({ one: true, two: false, three: true });
    });

    it("safely no-ops when no grid api is attached", () => {
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
      const base = makeBase();

      base.syncColumnVisibilityFromGrid();
      base.persistGridState();

      expect(setItemSpy).not.toHaveBeenCalled();
    });
  });

  describe("selection", () => {
    it("updates selected count from grid api", () => {
      const api = createGridApiMock();
      api.getSelectedRows.mockReturnValue([{ id: 1 }, { id: 2 }]);
      const base = makeBase();

      base.onSelectionChanged({ api } as unknown as SelectionChangedEvent);

      expect(base.selectedCount.value).toBe(2);
    });
  });

  describe("CSV export", () => {
    it("exports only visible columns with the configured filename", () => {
      const api = createGridApiMock();
      const base = makeBase();
      base.gridApi.value = api as never;
      base.columnVisibility.value.two = false;

      base.exportGridCsv();

      const arg = api.exportDataAsCsv.mock.calls[0]?.[0];
      expect(arg.fileName).toBe("test.csv");
      expect(arg.columnKeys).toEqual(["one", "three"]);
    });

    it("excludes csvExcludedColumnIds even when visible", () => {
      const api = createGridApiMock();
      const base = makeBase({ csvExcludedColumnIds: ["one"] });
      base.gridApi.value = api as never;

      base.exportGridCsv();

      const arg = api.exportDataAsCsv.mock.calls[0]?.[0];
      expect(arg.columnKeys).not.toContain("one");
      expect(arg.columnKeys).toEqual(["two", "three"]);
    });

    it("forwards a custom csvProcessCellCallback when provided", () => {
      const api = createGridApiMock();
      const callback = vi.fn(() => "custom");
      const base = makeBase({ csvProcessCellCallback: callback });
      base.gridApi.value = api as never;

      base.exportGridCsv();

      const arg = api.exportDataAsCsv.mock.calls[0]?.[0];
      expect(arg.processCellCallback).toBe(callback);
    });

    it("omits processCellCallback when none was supplied", () => {
      const api = createGridApiMock();
      const base = makeBase();
      base.gridApi.value = api as never;

      base.exportGridCsv();

      const arg = api.exportDataAsCsv.mock.calls[0]?.[0];
      expect(arg.processCellCallback).toBeUndefined();
    });
  });

  describe("grid sizing controls", () => {
    it("fits grid columns and persists", () => {
      const api = createGridApiMock();
      const base = makeBase();
      base.gridApi.value = api as never;

      base.fitGridColumns();

      expect(api.sizeColumnsToFit).toHaveBeenCalled();
    });

    it("auto-sizes grid columns and persists", () => {
      const api = createGridApiMock();
      const base = makeBase();
      base.gridApi.value = api as never;

      base.autoSizeGridColumns();

      expect(api.autoSizeAllColumns).toHaveBeenCalled();
    });
  });

  describe("reset", () => {
    it("clears persisted storage and restores default visibility", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ a: 1 }));
      const api = createGridApiMock();
      const base = makeBase();
      base.gridApi.value = api as never;
      base.quickFilterText.value = "x";
      base.selectedCount.value = 5;
      base.columnChooserOpen.value = true;
      base.columnVisibility.value.one = false;

      base.resetGridState();

      expect(base.quickFilterText.value).toBe("");
      expect(base.selectedCount.value).toBe(0);
      expect(base.columnChooserOpen.value).toBe(false);
      expect(base.columnVisibility.value).toEqual({ one: true, two: true, three: true });
      expect(api.deselectAll).toHaveBeenCalled();
      expect(api.setFilterModel).toHaveBeenCalledWith(null);
      expect(api.applyColumnState).toHaveBeenCalledWith({ defaultState: { sort: null } });
      expect(api.applyColumnState).toHaveBeenCalledWith({ defaultState: { hide: false } });
    });

    it("resets local state even without a grid api", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ a: 1 }));
      const base = makeBase();
      base.quickFilterText.value = "abc";
      base.columnChooserOpen.value = true;

      base.resetGridState();

      expect(base.quickFilterText.value).toBe("");
      expect(base.columnChooserOpen.value).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe("persistence", () => {
    it("persists grid state when an api is attached", () => {
      const api = createGridApiMock();
      const base = makeBase();
      base.gridApi.value = api as never;

      base.persistGridState();

      expect(localStorage.getItem(STORAGE_KEY)).toContain("foo");
    });
  });
});
