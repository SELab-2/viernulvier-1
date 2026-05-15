import { computed, type Ref } from "vue";
import type { ColDef } from "ag-grid-community";
import type { CmsTagGridRow } from "@/services/cms";
import { useCmsGridBase } from "./useCmsGridBase";

type TranslateFunction = (key: string, params?: Record<string, unknown>) => string;

const cmsTagGridStateStorageKey = "viernulvier-cms-tag-grid-state";
const cmsTagGridColumnIds = [
  "name",
  "tagType",
  "public",
  "productions",
] as const;

export function useCmsTagGrid(options: {
  isDark: Ref<boolean>;
  t: TranslateFunction;
}) {
  const base = useCmsGridBase<CmsTagGridRow>({
    isDark: options.isDark,
    storageKey: cmsTagGridStateStorageKey,
    columnIds: cmsTagGridColumnIds,
    csvFileName: "cms-tags.csv",
    fitOnReadyAfterRestore: true,
  });

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
    { colId: "productions", label: options.t("cms.columns.productions") },
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
      headerName: options.t("cms.columns.productions"),
      field: "productions",
      editable: false,
      minWidth: 200,
      flex: 1,
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
