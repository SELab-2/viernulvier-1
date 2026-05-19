import { computed, type Ref } from "vue";
import type {
  ColDef,
  Module,
  RowClassParams,
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
import type { ICellRendererParams } from "ag-grid-community";
import type { CmsProductionGridRow } from "@/services/cms";
import { useCmsGridBase } from "./useCmsGridBase";

type TranslateFunction = (key: string, params?: Record<string, unknown>) => string;

const cmsGridStateStorageKey = "viernulvier-cms-grid-state-v2";
const cmsGridColumnIds = [
  "id",
  "eventsAction",
  "performer",
  "title",
  "producer",
  "teaser",
  "genres",
  "tags",
  "descriptionOne",
  "descriptionTwo",
  "imageMedia",
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

/** Truncates long cell values for compact grid rendering. */
function truncateValue(value: string, maxLength = 48): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}...`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
    case "&":
      return "&amp;";
    case "<":
      return "&lt;";
    case ">":
      return "&gt;";
    case '"':
      return "&quot;";
    case "'":
      return "&#39;";
    /* v8 ignore next 2 -- regex above matches only the cases handled here */
    default:
      return character;
    }
  });
}

function renderMediaCell(value: unknown): string {
  const url = String(value ?? "").trim();
  if (url.length === 0) {
    return "";
  }

  const label = escapeHtml(truncateValue(url, 54));

  return `<span class="cms-media-text">${label}</span>`;
}

function renderImageMediaCell(
  params: ICellRendererParams<CmsProductionGridRow, unknown>,
  t: TranslateFunction,
): string {
  const urls = params.data?.imageMediaUrls ?? [];
  if (urls.length === 0) {
    return "";
  }

  const count = urls.length;
  const countLabel = count === 1
    ? t("cms.create.media.imageCountOne")
    : t("cms.create.media.imageCountOther", { count });

  return `<span class="cms-media-text">${escapeHtml(countLabel)}</span>`;
}

/**
 * CMS productions grid: layers production-specific column defs, cell styling
 * for empty/finalized rows, and a custom CSV cell processor on top of the
 * shared {@link useCmsGridBase} plumbing.
 */
export function useCmsProductionGrid(options: {
  isDark: Ref<boolean>;
  t: TranslateFunction;
  getGenreOptions?: () => Array<{ id: number; label: string }>;
  // Backwards-compatible: older tests/usage provide just labels.
  getGenreLabels?: () => string[];
  currentLang?: Ref<string>;
}) {
  const primaryTagLabelById = computed(() => {
    const optionsEntries = options.getGenreOptions?.() ?? [];
    if (optionsEntries.length > 0) {
      return new Map(optionsEntries.map((entry) => [entry.id, entry.label] as const));
    }

    const labels = options.getGenreLabels?.() ?? [];
    return new Map(labels.map((label, idx) => [idx + 1, label] as const));
  });

  function formatPrimaryTag(value: unknown): string {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length === 0 ? "-" : trimmed;
    }

    const id = Number(value ?? 0);
    if (!Number.isFinite(id) || id === 0) {
      return "-";
    }

    return primaryTagLabelById.value.get(id) ?? `#${id}`;
  }

  const base = useCmsGridBase<CmsProductionGridRow>({
    isDark: options.isDark,
    storageKey: cmsGridStateStorageKey,
    columnIds: cmsGridColumnIds,
    csvFileName: "cms-productions.csv",
    csvExcludedColumnIds: ["eventsAction"],
    csvProcessCellCallback: (params) => {
      if (params.column.getColId() === "tags") {
        const data = params.node?.data as CmsProductionGridRow | undefined;
        return JSON.stringify(data?.source.tags ?? []);
      }

      if (params.column.getColId() === "genres") {
        return formatPrimaryTag(params.value);
      }

      return String(params.value ?? "");
    },
  });

  const defaultColDef: ColDef<CmsProductionGridRow> = {
    editable: false,
    sortable: true,
    filter: true,
    floatingFilter: true,
    resizable: true,
    minWidth: 120,
    cellStyle: (params) => {
      const value = params.value;
      const isEmpty = !value || (typeof value === 'string' && value.trim() === '');
      if (isEmpty) {
        return {
          backgroundColor: 'rgba(249, 115, 22, 0.05)',
          color: 'rgba(120, 113, 108, 0.6)',
          fontStyle: 'italic',
        };
      }
      return null;
    },
  };

  const gridColumnOptions = computed(() => [
    { colId: "id", label: options.t("cms.columns.id") },
    { colId: "eventsAction", label: options.t("cms.columns.events") },
    { colId: "performer", label: options.t("cms.columns.performer") },
    { colId: "title", label: options.t("cms.columns.title") },
    { colId: "producer", label: options.t("cms.columns.producer") },
    { colId: "teaser", label: options.t("cms.columns.teaser") },
    { colId: "genres", label: options.t("cms.columns.genres") },
    { colId: "tags", label: options.t("cms.columns.tags") },
    { colId: "descriptionOne", label: options.t("cms.columns.descriptionOne") },
    { colId: "descriptionTwo", label: options.t("cms.columns.descriptionTwo") },
    { colId: "imageMedia", label: options.t("cms.columns.imageMedia") },
    { colId: "media", label: options.t("cms.columns.media") },
  ] as const);

  const columnDefs = computed<ColDef<CmsProductionGridRow>[]>(() => [
    {
      headerName: options.t("cms.columns.id"),
      field: "id",
      editable: false,
      minWidth: 90,
      maxWidth: 120,
      cellClass: "cms-production-id-cell",
      cellRenderer: (params: { value: number }) => {
        const lang = escapeHtml(options.currentLang?.value ?? "");
        const prefix = lang ? `/${lang}` : "";
        return `<a href="${prefix}/productions/${params.value}" class="text-ink-primary underline hover:text-ink-secondary transition-colors">${params.value}</a>`;
      },
    },
    {
      headerName: options.t("cms.columns.events"),
      colId: "eventsAction",
      minWidth: 120,
      maxWidth: 130,
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
      cellEditorParams: () => {
        // If labels-only provider exists, return labels array for backward
        // compatibility with older tests and consumers.
        if (options.getGenreLabels) {
          return { values: options.getGenreLabels() };
        }

        return {
          values: [0, ...(options.getGenreOptions?.().map((entry) => entry.id) ?? [])],
          formatValue: formatPrimaryTag,
        };
      },
      valueFormatter: ({ value }) => formatPrimaryTag(value),
      filterValueGetter: (params) => formatPrimaryTag(params.data?.genres),
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
      headerName: options.t("cms.columns.imageMedia"),
      field: "imageMedia",
      editable: false,
      minWidth: 150,
      cellClass: "cms-truncate-cell",
      cellRenderer: (params: ICellRendererParams<CmsProductionGridRow, unknown>) => renderImageMediaCell(params, options.t),
    },
    {
      headerName: options.t("cms.columns.media"),
      field: "media",
      editable: false,
      minWidth: 220,
      cellClass: "cms-truncate-cell",
      cellRenderer: (params: ICellRendererParams<CmsProductionGridRow, unknown>) => renderMediaCell(params.value),
    },
  ]);

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

  function getRowId(params: { data: CmsProductionGridRow }): string {
    return String(params.data.id);
  }

  return {
    ...base,
    columnDefs,
    defaultColDef,
    getRowId,
    getProductionRowStyle,
    gridColumnOptions,
  };
}
