import { computed, type Ref } from "vue";
import type { ColDef } from "ag-grid-community";
import type { CmsAdminGridRow } from "@/services/cms";
import { useCmsGridBase } from "./useCmsGridBase";

type TranslateFunction = (key: string, params?: Record<string, unknown>) => string;

const cmsAdminGridStateStorageKey = "viernulvier-cms-admin-grid-state";
const cmsAdminGridColumnIds = [
  "id",
  "username",
  // "profilePicture",
  "super",
] as const;

export function useCmsAdminGrid(options: {
  isDark: Ref<boolean>;
  t: TranslateFunction;
}) {
  const base = useCmsGridBase<CmsAdminGridRow>({
    isDark: options.isDark,
    storageKey: cmsAdminGridStateStorageKey,
    columnIds: cmsAdminGridColumnIds,
    csvFileName: "cms-admins.csv",
    fitOnReadyAfterRestore: true,
  });

  const selectionColumnDef: ColDef<CmsAdminGridRow> = {
    width: 48,
    minWidth: 48,
    maxWidth: 48,
    resizable: false,
    pinned: "left",
  };

  const defaultColDef: ColDef<CmsAdminGridRow> = {
    editable: false,
    sortable: true,
    filter: true,
    floatingFilter: true,
    resizable: true,
    minWidth: 120,
  };

  const gridColumnOptions = computed(() => [
    { colId: "id", label: options.t("cms.columns.id") },
    { colId: "username", label: options.t("cms.columns.admin.username") },
    // { colId: "profilePicture", label: options.t("cms.columns.admin.profilePicture") },
    { colId: "super", label: options.t("cms.columns.admin.super") },
  ] as const);

  const columnDefs = computed<ColDef<CmsAdminGridRow>[]>(() => [
    {
      headerName: options.t("cms.columns.id"),
      field: "id",
      editable: false,
      minWidth: 50,
      maxWidth: 100,
    },
    {
      headerName: options.t("cms.columns.admin.username"),
      field: "username",
      editable: true,
      minWidth: 200,
      flex: 1,
    },
    // {
    //   headerName: options.t("cms.columns.admin.profilePicture"),
    //   field: "profilePicture",
    //   editable: false,
    //   minWidth: 240,
    //   flex: 2,
    //   cellRenderer: (params: { value: string | null }) => {
    //     if (!params.value) return "-";
    //     return `<a href="${params.value}" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline truncate">${params.value}</a>`;
    //   },
    // },
    {
      headerName: options.t("cms.columns.admin.super"),
      field: "super",
      editable: true,
      cellEditor: "agCheckboxCellEditor",
      cellRenderer: "agCheckboxCellRenderer",
      minWidth: 100,
      maxWidth: 140,
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
