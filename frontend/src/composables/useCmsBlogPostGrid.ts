/**
 * AgGrid composable for the CMS blogpost tab.
 * Thin wrapper around {@link useCmsGridBase} — only defines blogpost-specific column defs.
 */
import { computed, type Ref } from "vue";
import type { ColDef } from "ag-grid-community";
import type { CmsBlogPostGridRow } from "@/services/cms";
import { useCmsGridBase } from "./useCmsGridBase";

type TranslateFunction = (key: string, params?: Record<string, unknown>) => string;

/** localStorage key for persisting column order, widths, sort, and filters. */
const cmsBlogPostGridStateStorageKey = "viernulvier-cms-blogpost-grid-state";

/** Canonical column IDs — drives default order, column-visibility state, and CSV export. */
const cmsBlogPostGridColumnIds = [
  "id",
  "title",
  "content",
  "publishedAt",
  "productions",
] as const;

export function useCmsBlogPostGrid(options: {
  isDark: Ref<boolean>;
  t: TranslateFunction;
}) {
  const base = useCmsGridBase<CmsBlogPostGridRow>({
    isDark: options.isDark,
    storageKey: cmsBlogPostGridStateStorageKey,
    columnIds: cmsBlogPostGridColumnIds,
    csvFileName: "cms-blogposts.csv",
    fitOnReadyAfterRestore: true,
  });

  /** Fixed-width checkbox column pinned left; excluded from columnIds as it's not user-togglable. */
  const selectionColumnDef: ColDef<CmsBlogPostGridRow> = {
    width: 48,
    minWidth: 48,
    maxWidth: 48,
    resizable: false,
    pinned: "left",
  };

  /** Defaults for all columns; editable: false ensures only explicit columns accept edits. */
  const defaultColDef: ColDef<CmsBlogPostGridRow> = {
    editable: false,
    sortable: true,
    filter: true,
    floatingFilter: true,
    resizable: true,
    minWidth: 120,
  };

  /** Labels for the column-chooser panel; must stay in sync with columnDefs. */
  const gridColumnOptions = computed(() => [
    { colId: "id", label: options.t("cms.columns.blogpost.id") },
    { colId: "title", label: options.t("cms.columns.blogpost.title") },
    { colId: "content", label: options.t("cms.columns.blogpost.content") },
    { colId: "publishedAt", label: options.t("cms.columns.blogpost.publishedAt") },
    { colId: "productions", label: options.t("cms.columns.blogpost.productions") },
  ] as const);

  const columnDefs = computed<ColDef<CmsBlogPostGridRow>[]>(() => [
    {
      headerName: options.t("cms.columns.blogpost.id"),
      field: "id",
      editable: false,
      minWidth: 50,
      maxWidth: 100,
    },
    {
      headerName: options.t("cms.columns.blogpost.title"),
      field: "title",
      editable: true,
      minWidth: 200,
      flex: 1,
    },
    {
      headerName: options.t("cms.columns.blogpost.content"),
      field: "content",
      editable: true,
      minWidth: 200,
      flex: 2,
    },
    {
      headerName: options.t("cms.columns.blogpost.publishedAt"),
      field: "publishedAt",
      editable: false,
      minWidth: 180,
      maxWidth: 240,
    },
    {
      headerName: options.t("cms.columns.blogpost.productions"),
      field: "productions",
      editable: false,
      minWidth: 200,
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