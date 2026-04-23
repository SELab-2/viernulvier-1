import { computed, ref, type Ref } from "vue";
import type {
  ColDef,
  GridApi,
  GridReadyEvent,
  GridState,
  SelectionChangedEvent,
} from "ag-grid-community";
import type { CmsTagGridRow } from "@/services/cms";

type TranslateFunction = (key: string, params?: Record<string, unknown>) => string;

const cmsTagGridStateStorageKey = "viernulvier-cms-tag-grid-state";
const cmsTagGridColumnIds = [
  "name",
  "tagType",
  "public",
  "productionCount",
] as const;

export function useCmsTagGrid(options: {
  isDark: Ref<boolean>;
  t: TranslateFunction;
}) {
  const gridApi = ref<GridApi<CmsTagGridRow> | null>(null);
  const quickFilterText = ref("");
  const selectedCount = ref(0);
  const columnChooserOpen = ref(false);
  const columnVisibility = ref<Record<string, boolean>>(
    Object.fromEntries(cmsTagGridColumnIds.map((colId) => [colId, true])) as Record<string, boolean>,
  );

  const rowSelection = {
    mode: "multiRow" as const,
    checkboxes: true,
    headerCheckbox: true,
    enableClickSelection: true,
  };

  const selectionColumnDef: ColDef<CmsTagGridRow> = {
    width: 48,
    minWidth: 48,
    maxWidth: 48,
    resizable: false,
    pinned: "left",
  };

  const defaultColDef: ColDef<CmsTagGridRow> = {
    editable: false,
    sortable: true,
    filter: true,
    floatingFilter: true,
    resizable: true,
    minWidth: 120,
  };

  const gridColumnOptions = computed(() => [
    { colId: "name", label: options.t("cms.columns.tagName") },
    { colId: "tagType", label: options.t("cms.columns.tagType") },
    { colId: "public", label: options.t("cms.columns.public") },
    { colId: "productionCount", label: options.t("cms.columns.productionCount") },
  ] as const);

  const columnDefs = computed<ColDef<CmsTagGridRow>[]>(() => [
    {
      headerName: options.t("cms.columns.tagName"),
      field: "name",
      editable: true,
      minWidth: 200,
      flex: 1,
    },
    {
      headerName: options.t("cms.columns.tagType"),
      field: "tagType",
      editable: false,
      minWidth: 160,
    },
    {
      headerName: options.t("cms.columns.public"),
      field: "public",
      editable: true,
      cellEditor: "agCheckboxCellEditor",
      cellRenderer: "agCheckboxCellRenderer",
      minWidth: 100,
      maxWidth: 140,
    },
    {
      headerName: options.t("cms.columns.productionCount"),
      field: "productionCount",
      editable: false,
      minWidth: 140,
      maxWidth: 180,
      filter: "agNumberColumnFilter",
    },
  ]);

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
    const rawState = localStorage.getItem(cmsTagGridStateStorageKey);
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

    localStorage.setItem(cmsTagGridStateStorageKey, JSON.stringify(gridApi.value.getState()));
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

  function resetGridFilters(): void {
    quickFilterText.value = "";
    gridApi.value?.setFilterModel(null);
    applyQuickFilter();
    persistGridState();
  }

  function exportGridCsv(): void {
    const visibleColumnKeys = cmsTagGridColumnIds.filter(
      (colId) => columnVisibility.value[colId] !== false,
    );

    gridApi.value?.exportDataAsCsv({
      fileName: "cms-tags.csv",
      columnKeys: visibleColumnKeys,
    });
  }

  function resetGridState(): void {
    localStorage.removeItem(cmsTagGridStateStorageKey);
    quickFilterText.value = "";
    selectedCount.value = 0;
    columnChooserOpen.value = false;
    gridApi.value?.deselectAll();
    gridApi.value?.setFilterModel(null);
    gridApi.value?.applyColumnState({ defaultState: { sort: null } });
    gridApi.value?.applyColumnState({ defaultState: { hide: false } });
    columnVisibility.value = Object.fromEntries(cmsTagGridColumnIds.map((colId) => [colId, true])) as Record<string, boolean>;
    gridApi.value?.sizeColumnsToFit();
    applyQuickFilter();
    persistGridState();
  }

  function onGridReady(event: GridReadyEvent<CmsTagGridRow>): void {
    gridApi.value = event.api;

    restoreGridState();
    event.api.sizeColumnsToFit();

    syncColumnVisibilityFromGrid();
    applyQuickFilter();
  }

  function applyQuickFilter(): void {
    gridApi.value?.setGridOption("quickFilterText", quickFilterText.value);
    persistGridState();
  }

  function onSelectionChanged(event: SelectionChangedEvent<CmsTagGridRow>): void {
    selectedCount.value = event.api.getSelectedRows().length;
    persistGridState();
  }

  return {
    agThemeVars,
    autoSizeGridColumns,
    columnChooserOpen,
    columnDefs,
    columnVisibility,
    defaultColDef,
    exportGridCsv,
    fitGridColumns,
    gridColumnOptions,
    onGridReady,
    onSelectionChanged,
    quickFilterText,
    resetGridFilters,
    resetGridState,
    rowSelection,
    selectionColumnDef,
    selectedCount,
    setGridColumnVisibility,
    applyQuickFilter,
    gridApi,
    persistGridState,
    syncColumnVisibilityFromGrid,
  };
}
