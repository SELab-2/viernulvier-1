/**
 * AgGrid composable for the CMS tag-type tab.
 * Thin wrapper around {@link useCmsGridBase} — only defines tag-type-specific column defs.
 */
import { computed, type Ref } from "vue";
import type { ColDef } from "ag-grid-community";
import type { CmsTagTypeGridRow } from "@/services/cms";
import { useCmsGridBase } from "./useCmsGridBase";

type TranslateFunction = (key: string, params?: Record<string, unknown>) => string;

/** localStorage key for persisting column order, widths, sort, and filters. */
const cmsTagTypeGridStateStorageKey = "viernulvier-cms-tag-type-grid-state";

/** Canonical column IDs — drives default order, column-visibility state, and CSV export. */
const cmsTagTypeGridColumnIds = [
  "name",
  "tagCount",
  "tags",
] as const;

export function useCmsTagTypeGrid(options: {
  isDark: Ref<boolean>;
  t: TranslateFunction;
}) {
  const base = useCmsGridBase<CmsTagTypeGridRow>({
    isDark: options.isDark,
    storageKey: cmsTagTypeGridStateStorageKey,
    columnIds: cmsTagTypeGridColumnIds,
    csvFileName: "cms-tag-types.csv",
    fitOnReadyAfterRestore: true,
  });

  /** Fixed-width checkbox column pinned left; excluded from columnIds as it's not user-togglable. */
  const selectionColumnDef: ColDef<CmsTagTypeGridRow> = {
    width: 48,
    minWidth: 48,
    maxWidth: 48,
    resizable: false,
    pinned: "left",
  };

  /** Defaults for all columns; editable: false ensures only explicit columns accept edits. */
  const defaultColDef: ColDef<CmsTagTypeGridRow> = {
    editable: false,
    sortable: true,
    filter: true,
    floatingFilter: true,
    resizable: true,
    minWidth: 120,
  };

  /** Labels for the column-chooser panel; must stay in sync with columnDefs. */
  const gridColumnOptions = computed(() => [
    { colId: "name", label: options.t("cms.columns.tagTypeName") },
    { colId: "tagCount", label: options.t("cms.columns.tagCount") },
    { colId: "tags", label: options.t("cms.columns.tagsInType") },
  ] as const);

  const columnDefs = computed<ColDef<CmsTagTypeGridRow>[]>(() => [
    {
      headerName: options.t("cms.columns.tagTypeName"),
      field: "name",
      editable: true,
      minWidth: 200,
      flex: 1,
    },
    {
      headerName: options.t("cms.columns.tagCount"),
      field: "tagCount",
      editable: false,
      minWidth: 120,
      maxWidth: 180,
      filter: "agNumberColumnFilter",
    },
    {
      headerName: options.t("cms.columns.tagsInType"),
      field: "tags",
      editable: false,
      minWidth: 200,
      valueFormatter: (params) => {
        const tags = params.value as number[];
        if (!Array.isArray(tags) || tags.length === 0) return "-";
        return tags.join(", ");
      },
    },
  ]);

  return {
    ...base,
    columnDefs,
    defaultColDef,
    gridColumnOptions,
    selectionColumnDef,
  };
}
