import { computed, ref, type Ref } from "vue";
import type {
  GridApi,
  GridReadyEvent,
  GridState,
  ProcessCellForExportParams,
  SelectionChangedEvent,
} from "ag-grid-community";

export interface UseCmsGridBaseOptions {
  isDark: Ref<boolean>;
  storageKey: string;
  columnIds: readonly string[];
  csvFileName: string;
  /** Column ids that should never appear in the CSV export (e.g. action columns). */
  csvExcludedColumnIds?: readonly string[];
  /** Custom cell processor for CSV export (e.g. JSON-stringify complex fields). */
  csvProcessCellCallback?: (params: ProcessCellForExportParams) => string;
  /**
   * Whether to call sizeColumnsToFit even when persisted state was restored.
   * Tag/Admin grids historically always fit; Production only fits when no state was restored.
   */
  fitOnReadyAfterRestore?: boolean;
} 

/**
 * Shared CMS grid plumbing: state persistence, column visibility, theme vars,
 * quick filter, CSV export, and lifecycle handlers. Specialized composables
 * layer entity-specific column defs on top.
 */
export function useCmsGridBase<TRow>(options: UseCmsGridBaseOptions) {
  const gridApi = ref<GridApi<TRow> | null>(null);
  const quickFilterText = ref("");
  const selectedCount = ref(0);
  const columnChooserOpen = ref(false);
  const columnVisibility = ref<Record<string, boolean>>(
    Object.fromEntries(options.columnIds.map((colId) => [colId, true])) as Record<string, boolean>,
  );

  const rowSelection = {
    mode: "multiRow" as const,
    checkboxes: true,
    headerCheckbox: true,
    enableClickSelection: false,
    selectAll: "filtered" as const,
  };

  const agThemeVars = computed<Record<string, string>>(() => {
    if (options.isDark.value) {
      return {
        "--ag-background-color": "var(--surface-0)",
        "--ag-foreground-color": "var(--ink-primary)",
        "--ag-header-background-color": "var(--surface-inv-raised)",
        "--ag-header-foreground-color": "var(--ink-on-inv)",
        "--ag-odd-row-background-color": "color-mix(in srgb, var(--surface-inv-raised) 55%, transparent)",
        "--ag-row-hover-color": "color-mix(in srgb, var(--surface-inv-border) 65%, transparent)",
        "--ag-border-color": "var(--surface-inv-border)",
        "--ag-selected-row-background-color": "transparent",
        "--ag-range-selection-background-color": "transparent",
        "--ag-header-column-separator-color": "var(--surface-inv-border)",
        "--ag-input-focus-border-color": "var(--surface-inv)",
        "--ag-font-family": '"Inter Variable", sans-serif',
        "--ag-font-size": "13px",
        "--cms-selected-row-bg": "color-mix(in srgb, var(--surface-inv-raised) 42%, transparent)",
        "--cms-header-fg": "var(--ink-on-inv)",
        "--cms-checkbox-color": "var(--ink-on-inv)",
      };
    }

    return {
      "--ag-background-color": "var(--surface-0)",
      "--ag-foreground-color": "var(--ink-primary)",
      "--ag-header-background-color": "var(--surface-1)",
      "--ag-header-foreground-color": "var(--ink-primary)",
      "--ag-odd-row-background-color": "var(--surface-1)",
      "--ag-row-hover-color": "color-mix(in srgb, var(--surface-2) 70%, transparent)",
      "--ag-border-color": "var(--surface-3)",
      "--ag-selected-row-background-color": "transparent",
      "--ag-range-selection-background-color": "transparent",
      "--ag-header-column-separator-color": "var(--surface-3)",
      "--ag-input-focus-border-color": "var(--surface-inv)",
      "--ag-font-family": '"Inter Variable", sans-serif',
      "--ag-font-size": "13px",
      "--cms-selected-row-bg": "color-mix(in srgb, var(--surface-2) 55%, transparent)",
      "--cms-header-fg": "var(--ink-primary)",
      "--cms-checkbox-color": "var(--ink-primary)",
    };
  });

  function loadPersistedGridState(): GridState | null {
    const rawState = localStorage.getItem(options.storageKey);
    if (!rawState) {
      return null;
    }

    try {
      return JSON.parse(rawState) as GridState;
    } catch {
      return null;
    }
  }

  function persistGridState(): void {
    if (!gridApi.value) {
      return;
    }

    localStorage.setItem(options.storageKey, JSON.stringify(gridApi.value.getState()));
  }

  function syncColumnVisibilityFromGrid(): void {
    const state = gridApi.value?.getColumnState() ?? [];
    const nextVisibility: Record<string, boolean> = { ...columnVisibility.value };

    for (const column of state) {
      if (column.colId) {
        nextVisibility[column.colId] = column.hide !== true;
      }
    }

    columnVisibility.value = nextVisibility;
  }

  function restoreGridState(): boolean {
    const state = loadPersistedGridState();
    if (!gridApi.value || !state) {
      return false;
    }

    gridApi.value.setState(state);
    syncColumnVisibilityFromGrid();
    return true;
  }

  function setGridColumnVisibility(colId: string, visible: boolean): void {
    columnVisibility.value = {
      ...columnVisibility.value,
      [colId]: visible,
    };

    gridApi.value?.applyColumnState({
      state: [{ colId, hide: !visible }],
    });
    gridApi.value?.sizeColumnsToFit();
    persistGridState();
  }

  function fitGridColumns(): void {
    gridApi.value?.sizeColumnsToFit();
    persistGridState();
  }

  function autoSizeGridColumns(): void {
    gridApi.value?.autoSizeAllColumns();
    persistGridState();
  }

  function applyQuickFilter(): void {
    gridApi.value?.setGridOption("quickFilterText", quickFilterText.value);
    persistGridState();
  }

  function resetGridFilters(): void {
    quickFilterText.value = "";
    gridApi.value?.setFilterModel(null);
    applyQuickFilter();
    persistGridState();
  }

  function exportGridCsv(): void {
    const excluded = options.csvExcludedColumnIds ?? [];
    const visibleColumnKeys = options.columnIds.filter(
      (colId) => !excluded.includes(colId) && columnVisibility.value[colId] !== false,
    );

    gridApi.value?.exportDataAsCsv({
      fileName: options.csvFileName,
      columnKeys: visibleColumnKeys,
      ...(options.csvProcessCellCallback
        ? { processCellCallback: options.csvProcessCellCallback }
        : {}),
    });
  }

  function resetGridState(): void {
    localStorage.removeItem(options.storageKey);
    quickFilterText.value = "";
    selectedCount.value = 0;
    columnChooserOpen.value = false;
    gridApi.value?.deselectAll();
    gridApi.value?.setFilterModel(null);
    gridApi.value?.applyColumnState({ defaultState: { sort: null } });
    gridApi.value?.applyColumnState({ defaultState: { hide: false } });
    columnVisibility.value = Object.fromEntries(
      options.columnIds.map((colId) => [colId, true]),
    ) as Record<string, boolean>;
    gridApi.value?.sizeColumnsToFit();
    applyQuickFilter();
    persistGridState();
  }

  function onGridReady(event: GridReadyEvent<TRow>): void {
    gridApi.value = event.api;

    const restored = restoreGridState();
    if (!restored || options.fitOnReadyAfterRestore) {
      event.api.sizeColumnsToFit();
    }

    syncColumnVisibilityFromGrid();
    applyQuickFilter();
  }

  function onSelectionChanged(event: SelectionChangedEvent<TRow>): void {
    selectedCount.value = event.api.getSelectedRows().length;
    persistGridState();
  }

  return {
    agThemeVars,
    applyQuickFilter,
    autoSizeGridColumns,
    columnChooserOpen,
    columnVisibility,
    exportGridCsv,
    fitGridColumns,
    gridApi,
    onGridReady,
    onSelectionChanged,
    persistGridState,
    quickFilterText,
    resetGridFilters,
    resetGridState,
    rowSelection,
    selectedCount,
    setGridColumnVisibility,
    syncColumnVisibilityFromGrid,
  };
}
