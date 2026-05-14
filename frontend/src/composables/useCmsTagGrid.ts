import { computed, markRaw, type Ref } from "vue";
import type { ColDef } from "ag-grid-community";
import type { TagType } from "@viernulvier/shared";
import type { CmsTagGridRow } from "@/services/cms";
import type { LanguageMap } from "@/utils/language-utils";
import TagTypeCellEditor from "@/components/admin/cms/tags/TagTypeCellEditor.vue";
import { useCmsGridBase } from "./useCmsGridBase";

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
  getTagTypes: () => TagType[];
  localize: (map: LanguageMap | null | undefined) => string;
  onCreateTagTypeRequest: (ctx: { rowId: number; initialName: string }) => void;
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
      colId: "tagType",
      headerName: options.t("cms.columns.tagType"),
      valueGetter: (params) => params.data?.tagTypeId ?? null,
      valueFormatter: (params) => {
        const row = params.data as CmsTagGridRow | undefined;
        return row?.tagType ?? "";
      },
      filterValueGetter: (params) => {
        const row = params.data as CmsTagGridRow | undefined;
        return row?.tagType ?? "";
      },
      editable: true,
      singleClickEdit: true,
      cellEditor: markRaw(TagTypeCellEditor),
      cellEditorPopup: true,
      cellEditorParams: () => ({
        tagTypes: options.getTagTypes(),
        localize: options.localize,
        onCreateRequest: options.onCreateTagTypeRequest,
      }),
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

  return {
    ...base,
    columnDefs,
    defaultColDef,
    gridColumnOptions,
    selectionColumnDef,
  };
}
