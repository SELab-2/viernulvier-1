import { computed, ref, type Ref } from "vue";
import type {
  ColDef,
  GridApi,
  GridReadyEvent,
  GridState,
  Module,
  RowClassParams,
  SelectionChangedEvent,
} from "ag-grid-community";
import {
  AllCommunityModule,
  BigIntFilterModule,
  CellApiModule,
  CellSpanModule,
  CellStyleModule,
  CheckboxEditorModule,
  ClientSideRowModelApiModule,
  ClientSideRowModelModule,
  ColumnApiModule,
  ColumnAutoSizeModule,
  ColumnHoverModule,
  CsvExportModule,
  CustomEditorModule,
  CustomFilterModule,
  DateEditorModule,
  DateFilterModule,
  DragAndDropModule,
  EventApiModule,
  ExternalFilterModule,
  GridStateModule,
  HighlightChangesModule,
  InfiniteRowModelModule,
  LargeTextEditorModule,
  LocaleModule,
  ModuleRegistry,
  NumberEditorModule,
  NumberFilterModule,
  PaginationModule,
  PinnedRowModule,
  QuickFilterModule,
  RenderApiModule,
  RowApiModule,
  RowAutoHeightModule,
  RowDragModule,
  RowSelectionModule,
  RowStyleModule,
  ScrollApiModule,
  SelectEditorModule,
  TextEditorModule,
  TextFilterModule,
  UndoRedoEditModule,
  ValidationModule,
  ValueCacheModule,
} from "ag-grid-community";
import type { CmsProductionGridRow } from "@/services/cms";

type TranslateFunction = (key: string, params?: Record<string, unknown>) => string;

const cmsGridStateStorageKey = "viernulvier-cms-grid-state";
const cmsGridColumnIds = [
  "eventsAction",
  "performer",
  "title",
  "producer",
  "teaser",
  "genres",
  "tags",
  "descriptionOne",
  "descriptionTwo",
  "media",
] as const;

const agModules: Module[] = [
  AllCommunityModule,
  ClientSideRowModelModule,
  ClientSideRowModelApiModule,
  ColumnApiModule,
  RowApiModule,
  ScrollApiModule,
  RenderApiModule,
  CellApiModule,
  ValueCacheModule,
  InfiniteRowModelModule,
  CsvExportModule,
  PaginationModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  CustomFilterModule,
  BigIntFilterModule,
  QuickFilterModule,
  ExternalFilterModule,
  RowSelectionModule,
  ColumnAutoSizeModule,
  ColumnHoverModule,
  DragAndDropModule,
  RowDragModule,
  PinnedRowModule,
  GridStateModule,
  HighlightChangesModule,
  RowAutoHeightModule,
  CellSpanModule,
  CellStyleModule,
  RowStyleModule,
  ValidationModule,
  LocaleModule,
  EventApiModule,
  CheckboxEditorModule,
  CustomEditorModule,
  DateEditorModule,
  LargeTextEditorModule,
  NumberEditorModule,
  SelectEditorModule,
  TextEditorModule,
  UndoRedoEditModule,
];

ModuleRegistry.registerModules(agModules);

function truncateValue(value: string, maxLength = 48): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}...`;
}

export function useCmsProductionGrid(options: {
  isDark: Ref<boolean>;
  t: TranslateFunction;
  getPrimaryTagLabels?: () => string[];
}) {
  const gridApi = ref<GridApi<CmsProductionGridRow> | null>(null);
  const quickFilterText = ref("");
  const selectedCount = ref(0);
  const columnChooserOpen = ref(false);
  const columnVisibility = ref<Record<string, boolean>>(
    Object.fromEntries(cmsGridColumnIds.map((colId) => [colId, true])) as Record<string, boolean>,
  );

  const rowSelection = {
    mode: "multiRow" as const,
    checkboxes: true,
    headerCheckbox: true,
    enableClickSelection: true,
  };

  const defaultColDef: ColDef<CmsProductionGridRow> = {
    editable: false,
    sortable: true,
    filter: true,
    floatingFilter: true,
    resizable: true,
    minWidth: 120,
  };

  const gridColumnOptions = computed(() => [
    { colId: "eventsAction", label: "Events" },
    { colId: "performer", label: options.t("cms.columns.performer") },
    { colId: "title", label: options.t("cms.columns.title") },
    { colId: "producer", label: options.t("cms.columns.producer") },
    { colId: "teaser", label: options.t("cms.columns.teaser") },
    { colId: "genres", label: options.t("cms.columns.genres") },
    { colId: "tags", label: options.t("cms.columns.tags") },
    { colId: "descriptionOne", label: options.t("cms.columns.descriptionOne") },
    { colId: "descriptionTwo", label: options.t("cms.columns.descriptionTwo") },
    { colId: "media", label: options.t("cms.columns.media") },
  ] as const);

  const columnDefs = computed<ColDef<CmsProductionGridRow>[]>(() => [
    {
      headerName: "Events",
      colId: "eventsAction",
      minWidth: 96,
      maxWidth: 112,
      resizable: false,
      sortable: false,
      filter: false,
      editable: false,
      valueGetter: () => "View",
      cellClass: "cms-events-action-cell",
    },
    {
      headerName: options.t("cms.columns.performer"),
      field: "performer",
      editable: true,
      minWidth: 180,
    },
    {
      headerName: options.t("cms.columns.title"),
      field: "title",
      editable: true,
      minWidth: 170,
    },
    {
      headerName: options.t("cms.columns.producer"),
      field: "producer",
      editable: true,
      minWidth: 170,
    },
    {
      headerName: options.t("cms.columns.teaser"),
      field: "teaser",
      editable: true,
      minWidth: 200,
      cellClass: "cms-truncate-cell cms-wrap-cell",
      wrapText: true,
      autoHeight: true,
      valueFormatter: ({ value }) => truncateValue(String(value ?? "")),
    },
    {
      headerName: options.t("cms.columns.genres"),
      field: "genres",
      editable: true,
      singleClickEdit: true,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: () => ({
        values: options.getPrimaryTagLabels?.() ?? [],
      }),
      minWidth: 120,
    },
    {
      headerName: options.t("cms.columns.tags"),
      field: "tags",
      minWidth: 120,
    },
    {
      headerName: options.t("cms.columns.descriptionOne"),
      field: "descriptionOne",
      editable: false,
      minWidth: 220,
      cellClass: "cms-truncate-cell cms-wrap-cell",
      wrapText: true,
      autoHeight: true,
      valueFormatter: ({ value }) => truncateValue(String(value ?? "")),
    },
    {
      headerName: options.t("cms.columns.descriptionTwo"),
      field: "descriptionTwo",
      editable: false,
      minWidth: 220,
      cellClass: "cms-truncate-cell cms-wrap-cell",
      wrapText: true,
      autoHeight: true,
      valueFormatter: ({ value }) => truncateValue(String(value ?? "")),
    },
    {
      headerName: options.t("cms.columns.media"),
      field: "media",
      editable: false,
      minWidth: 220,
      cellClass: "cms-truncate-cell",
      valueFormatter: ({ value }) => truncateValue(String(value ?? "")),
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
    const rawState = localStorage.getItem(cmsGridStateStorageKey);
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

    localStorage.setItem(cmsGridStateStorageKey, JSON.stringify(gridApi.value.getState()));
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
    const visibleColumnKeys = cmsGridColumnIds.filter(
      (colId) => colId !== "eventsAction" && columnVisibility.value[colId] !== false,
    );

    gridApi.value?.exportDataAsCsv({
      fileName: "cms-productions.csv",
      columnKeys: visibleColumnKeys,
      processCellCallback: (params) => {
        if (params.column.getColId() === "tags") {
          const data = params.node?.data as CmsProductionGridRow | undefined;
          return JSON.stringify(data?.source.tags ?? []);
        }

        return String(params.value ?? "");
      },
    });
  }

  function resetGridState(): void {
    localStorage.removeItem(cmsGridStateStorageKey);
    quickFilterText.value = "";
    selectedCount.value = 0;
    columnChooserOpen.value = false;
    gridApi.value?.deselectAll();
    gridApi.value?.setFilterModel(null);
    gridApi.value?.applyColumnState({ defaultState: { sort: null } });
    gridApi.value?.applyColumnState({ defaultState: { hide: false } });
    columnVisibility.value = Object.fromEntries(cmsGridColumnIds.map((colId) => [colId, true])) as Record<string, boolean>;
    gridApi.value?.sizeColumnsToFit();
    applyQuickFilter();
    persistGridState();
  }

  function onGridReady(event: GridReadyEvent<CmsProductionGridRow>): void {
    gridApi.value = event.api;

    const restored = restoreGridState();
    if (!restored) {
      event.api.sizeColumnsToFit();
    }

    syncColumnVisibilityFromGrid();
    applyQuickFilter();
  }

  function applyQuickFilter(): void {
    gridApi.value?.setGridOption("quickFilterText", quickFilterText.value);
    persistGridState();
  }

  function onSelectionChanged(event: SelectionChangedEvent<CmsProductionGridRow>): void {
    selectedCount.value = event.api.getSelectedRows().length;
    persistGridState();
  }

  function getProductionRowStyle(
    params: RowClassParams<CmsProductionGridRow>,
  ): Record<string, string> | undefined {
    if (params.data?.source.finalized === false) {
      return {
        backgroundColor: "color-mix(in srgb, var(--surface-2) 34%, transparent)",
      };
    }

    return undefined;
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
    getProductionRowStyle,
    gridColumnOptions,
    onGridReady,
    onSelectionChanged,
    quickFilterText,
    resetGridFilters,
    resetGridState,
    rowSelection,
    selectedCount,
    setGridColumnVisibility,
    applyQuickFilter,
    gridApi,
    persistGridState,
    syncColumnVisibilityFromGrid,
  };
}