import { describe, expect, it, vi, beforeEach } from "vitest";
import { ref } from "vue";
import type { GridReadyEvent, SelectionChangedEvent } from "ag-grid-community";
import { useCmsProductionGrid } from "@/composables/useCmsProductionGrid";

function createGridApiMock() {
  return {
    getState: vi.fn(() => ({ foo: "bar" })),
    setState: vi.fn(),
    getColumnState: vi.fn(() => [
      { colId: "title", hide: false },
      { colId: "tags", hide: true },
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

describe("useCmsProductionGrid", () => {
  const storageKey = "viernulvier-cms-grid-state-v2";

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("initializes defaults and builds column definitions", () => {
    const grid = useCmsProductionGrid({
      isDark: ref(false),
      t: (key) => key,
    });

    expect(grid.quickFilterText.value).toBe("");
    expect(grid.selectedCount.value).toBe(0);
    expect(grid.columnDefs.value).toHaveLength(10);
    expect(grid.gridColumnOptions.value).toHaveLength(10);
    expect(grid.defaultColDef.editable).toBe(false);
    expect(grid.rowSelection.mode).toBe("multiRow");

    const defs = grid.columnDefs.value;
    const eventsValueGetter = defs[0]?.valueGetter as ((params: unknown) => string) | undefined;
    expect(eventsValueGetter?.({})).toBe("View");

    const teaserFormatter = defs.find((d) => d.field === "teaser")?.valueFormatter as
      | ((params: { value: unknown }) => string)
      | undefined;
    expect(teaserFormatter?.({ value: "short" })).toBe("short");
    expect(teaserFormatter?.({ value: "x".repeat(80) })).toBe(`${"x".repeat(47)}...`);

    const descriptionFormatter = defs.find((d) => d.field === "descriptionOne")?.valueFormatter as
      | ((params: { value: unknown }) => string)
      | undefined;
    expect(descriptionFormatter?.({ value: null })).toBe("");

    const mediaRenderer = defs.find((d) => d.field === "media")?.cellRenderer as
      | ((params: { value: unknown }) => string)
      | undefined;
    expect(mediaRenderer?.({ value: "https://example.com/cover.jpg" } as never)).toContain("cms-media-text");
    expect(mediaRenderer?.({ value: "https://example.com/trailer.mp4" } as never)).toContain("cms-media-text");
    expect(mediaRenderer?.({ value: "plain text" } as never)).toContain("cms-media-text");
  });

  it("returns dark and light theme variables", () => {
    const isDark = ref(false);
    const grid = useCmsProductionGrid({
      isDark,
      t: (key) => key,
    });

    expect(grid.agThemeVars.value["--cms-header-fg"]).toBe("var(--ink-primary)");
    isDark.value = true;
    expect(grid.agThemeVars.value["--cms-header-fg"]).toBe("var(--ink-on-inv)");
  });

  it("builds genre editor values from primary tag labels with safe fallback", () => {
    const withLabels = useCmsProductionGrid({
      isDark: ref(false),
      t: (key) => key,
      getPrimaryTagLabels: () => ["Genre A", "Genre B"],
    });
    const withLabelsGenresCol = withLabels.columnDefs.value.find((col) => col.field === "genres");
    const withLabelsParams = withLabelsGenresCol?.cellEditorParams as (() => { values: string[] }) | undefined;
    expect(withLabelsParams?.().values).toEqual(["Genre A", "Genre B"]);

    const withoutLabels = useCmsProductionGrid({
      isDark: ref(false),
      t: (key) => key,
    });
    const withoutLabelsGenresCol = withoutLabels.columnDefs.value.find((col) => col.field === "genres");
    const withoutLabelsParams = withoutLabelsGenresCol?.cellEditorParams as
      | (() => { values: string[] })
      | undefined;
    expect(withoutLabelsParams?.().values).toEqual([]);
  });

  it("renders media values as text and escapes html safely", () => {
    const grid = useCmsProductionGrid({
      isDark: ref(false),
      t: (key) => key,
    });

    const mediaRenderer = grid.columnDefs.value.find((col) => col.field === "media")?.cellRenderer as
      | ((params: { value: unknown }) => string)
      | undefined;

    const rendered = mediaRenderer?.({ value: `https://example.com/a & b<'">.jpg` } as never) ?? "";
    expect(rendered).toContain("https://example.com/a &amp; b&lt;&#39;&quot;&gt;.jpg");
    expect(rendered).toContain("cms-media-text");

    expect(mediaRenderer?.({ value: "plain text" } as never)).toContain("plain text");
  });

  it("restores state on grid ready when persisted state is present", () => {
    const api = createGridApiMock();
    localStorage.setItem(storageKey, JSON.stringify({ columns: [] }));

    const grid = useCmsProductionGrid({
      isDark: ref(false),
      t: (key) => key,
    });

    grid.onGridReady({ api } as unknown as GridReadyEvent);

    expect(api.setState).toHaveBeenCalled();
    expect(api.sizeColumnsToFit).not.toHaveBeenCalled();
    expect(grid.columnVisibility.value.tags).toBe(false);
  });

  it("fits columns on grid ready when no persisted state exists", () => {
    const api = createGridApiMock();
    const grid = useCmsProductionGrid({
      isDark: ref(false),
      t: (key) => key,
    });

    grid.onGridReady({ api } as unknown as GridReadyEvent);

    expect(api.sizeColumnsToFit).toHaveBeenCalled();
  });

  it("falls back to fit when persisted state is invalid JSON", () => {
    const api = createGridApiMock();
    localStorage.setItem(storageKey, "{bad-json");

    const grid = useCmsProductionGrid({
      isDark: ref(false),
      t: (key) => key,
    });

    grid.onGridReady({ api } as unknown as GridReadyEvent);

    expect(api.setState).not.toHaveBeenCalled();
    expect(api.sizeColumnsToFit).toHaveBeenCalled();
  });

  it("updates column visibility and persists state", () => {
    const api = createGridApiMock();
    const grid = useCmsProductionGrid({
      isDark: ref(false),
      t: (key) => key,
    });
    grid.gridApi.value = api as never;

    grid.setGridColumnVisibility("tags", false);

    expect(api.applyColumnState).toHaveBeenCalledWith({ state: [{ colId: "tags", hide: true }] });
    expect(grid.columnVisibility.value.tags).toBe(false);
    expect(localStorage.getItem(storageKey)).toContain("foo");
  });

  it("can re-show a hidden column", () => {
    const api = createGridApiMock();
    const grid = useCmsProductionGrid({
      isDark: ref(false),
      t: (key) => key,
    });
    grid.gridApi.value = api as never;

    grid.setGridColumnVisibility("tags", true);

    expect(api.applyColumnState).toHaveBeenCalledWith({ state: [{ colId: "tags", hide: false }] });
    expect(grid.columnVisibility.value.tags).toBe(true);
  });

  it("handles fit, autosize, filters and quick filter application", () => {
    const api = createGridApiMock();
    const grid = useCmsProductionGrid({
      isDark: ref(false),
      t: (key) => key,
    });
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

  it("exports CSV with tags serialized from source data", () => {
    const api = createGridApiMock();
    const grid = useCmsProductionGrid({
      isDark: ref(false),
      t: (key) => key,
    });
    grid.gridApi.value = api as never;

    grid.exportGridCsv();

    const exportArg = api.exportDataAsCsv.mock.calls[0]?.[0];
    expect(exportArg.fileName).toBe("cms-productions.csv");
    expect(exportArg.columnKeys).not.toContain("eventsAction");

    const serializedTags = exportArg.processCellCallback({
      column: { getColId: () => "tags" },
      node: { data: { source: { tags: [1, 2] } } },
      value: "ignored",
    });
    expect(serializedTags).toBe("[1,2]");

    const plainValue = exportArg.processCellCallback({
      column: { getColId: () => "title" },
      node: null,
      value: "My Title",
    });
    expect(plainValue).toBe("My Title");
  });

  it("resets grid state and restores defaults", () => {
    const api = createGridApiMock();
    const grid = useCmsProductionGrid({
      isDark: ref(false),
      t: (key) => key,
    });
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
    expect(grid.columnVisibility.value.tags).toBe(true);
  });

  it("updates selection count on selection change", () => {
    const api = createGridApiMock();
    api.getSelectedRows.mockReturnValue([{ id: 1 }, { id: 2 }]);

    const grid = useCmsProductionGrid({
      isDark: ref(false),
      t: (key) => key,
    });

    grid.onSelectionChanged({ api } as unknown as SelectionChangedEvent);

    expect(grid.selectedCount.value).toBe(2);
  });

  it("is safe to call sync and persist helpers without a grid api", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    const grid = useCmsProductionGrid({
      isDark: ref(false),
      t: (key) => key,
    });

    grid.syncColumnVisibilityFromGrid();
    grid.persistGridState();

    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it("resets local state even without a grid api", () => {
    localStorage.setItem(storageKey, JSON.stringify({ a: 1 }));
    const grid = useCmsProductionGrid({
      isDark: ref(false),
      t: (key) => key,
    });
    grid.quickFilterText.value = "abc";
    grid.columnChooserOpen.value = true;

    grid.resetGridState();

    expect(grid.quickFilterText.value).toBe("");
    expect(grid.columnChooserOpen.value).toBe(false);
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it("returns row style for unfinalized productions", () => {
    const grid = useCmsProductionGrid({
      isDark: ref(false),
      t: (key) => key,
    });

    expect(grid.getProductionRowStyle({ data: { source: { finalized: false } } } as never)).toEqual({
      backgroundColor: "color-mix(in srgb, var(--surface-2) 34%, transparent)",
    });
    expect(grid.getProductionRowStyle({ data: { source: { finalized: true } } } as never)).toBeUndefined();
    expect(grid.getProductionRowStyle({ data: undefined } as never)).toBeUndefined();
  });

  it("styles empty cells and leaves non-empty cells untouched", () => {
    const grid = useCmsProductionGrid({
      isDark: ref(false),
      t: (key) => key,
    });

    const cellStyle = grid.defaultColDef.cellStyle as ((params: { value: unknown }) => Record<string, string> | null) | undefined;
    const emptyStyle = cellStyle?.({ value: "   " });
    const nonEmptyStyle = cellStyle?.({ value: "filled" });

    expect(emptyStyle).toEqual({
      backgroundColor: "rgba(249, 115, 22, 0.05)",
      color: "rgba(120, 113, 108, 0.6)",
      fontStyle: "italic",
    });
    expect(nonEmptyStyle).toBeNull();
  });
});
