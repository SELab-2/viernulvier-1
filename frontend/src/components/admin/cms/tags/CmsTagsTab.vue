<template>
  <CmsTabShell
    v-model:quick-filter-text="quickFilterText"
    v-model:column-chooser-open="columnChooserOpen"
    :row-count="rowData.length"
    loaded-count-key="cms.actions.loadedTagsCount"
    :is-loading="isLoading"
    :load-error="loadError"
    :save-error="saveError"
    :selected-count="selectedCount"
    :column-options="gridColumnOptions"
    :column-visibility="columnVisibility"
    @apply-quick-filter="applyQuickFilter"
    @fit-columns="fitGridColumns"
    @auto-size-columns="autoSizeGridColumns"
    @reset-filters="resetGridFilters"
    @export-csv="exportGridCsv"
    @reset-state="resetGridState"
    @set-column-visibility="setGridColumnVisibility"
  >
    <template #header-actions>
      <div class="flex flex-col gap-2">
        <button type="button" class="cms-add-button" data-testid="cms-add-tag" @click="openCreateModal">
          {{ t("cms.actions.addTag") }}
        </button>
        <button
          type="button"
          class="cms-remove-button"
          data-testid="cms-remove-tags"
          :disabled="selectedCount === 0"
          @click="openRemoveConfirm"
        >
          {{ t("cms.actions.removeTag") }}
        </button>
      </div>
    </template>

    <template #grid>
      <AgGridVue
        :class="['ag-theme-alpine', 'cms-grid']"
        :style="agThemeVars"
        :column-defs="columnDefs"
        :default-col-def="defaultColDef"
        :row-data="rowData"
        :animate-rows="true"
        :pagination="false"
        :header-height="44"
        :row-height="42"
        :loading="isLoading"
        :row-selection="rowSelection"
        :selection-column-def="selectionColumnDef"
        :suppress-row-click-selection="true"
        :column-hover-highlight="true"
        :enable-cell-text-selection="true"
        :ensure-dom-order="true"
        :undo-redo-cell-editing="true"
        :undo-redo-cell-editing-limit="25"
        :value-cache="true"
        :cache-quick-filter="true"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @cell-editing-stopped="onCellEditingStopped"
        @cell-clicked="onCellClicked"
      />
    </template>

    <template #modals>
      <CmsRemoveConfirmModal
        v-if="removeConfirmOpen"
        :is-loading="removeConfirmLoading"
        :error="removeConfirmError"
        :count="selectedCount"
        title-key="cms.actions.tag.confirmRemoveDialogTitle"
        body-key="cms.actions.tag.confirmRemoveBody"
        @close="closeRemoveConfirm"
        @confirm="confirmRemove"
      />

      <CmsCreateTagModal
        :open="createModalOpen"
        :create-form="createForm"
        :create-extra-langs="createExtraLangs"
        :visible-create-langs="visibleCreateLangs"
        :lang-grid-class="langGridClass"
        :tag-types="tagTypesData"
        :create-error="createError"
        :is-creating="isCreating"
        :localize-value="localizeValue"
        @close="closeCreateModal"
        @submit="submitCreateTag"
        @update-name="setCreateName"
        @update-tag-type="setCreateTagType"
        @update-public="setCreatePublic"
        @update-extra-lang="setCreateExtraLang"
      />
      
      <CmsEditorPanel
        v-model:panel="editorPanel"
        :bulk-count="editorBulkCount"
        :save-error="saveError"
        :is-saving="isSaving"
        @close="closeEditorPanel"
        @save="saveEditorPanel"
      />

      <CmsEditListPanel
        v-model:panel="editProductionsPanel"
        :save-error="saveError"
        :is-saving="isSaving"
        @close="closeEditProductionsPanel"
        @save="saveEditProductionsPanel"
      />
    </template>
  </CmsTabShell>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import type { CellClickedEvent, CellEditingStoppedEvent } from "ag-grid-community";
import { useI18n } from "vue-i18n";
import type { Tag, TagType } from "@viernulvier/shared";
import CmsRemoveConfirmModal from "@/components/admin/cms/CmsRemoveConfirmModal.vue";
import CmsEditorPanel from "@/components/admin/cms/CmsEditorPanel.vue";
import CmsTabShell from "@/components/admin/cms/CmsTabShell.vue";
import CmsCreateTagModal from "@/components/admin/cms/tags/CmsCreateTagModal.vue";
import CmsEditListPanel, { type EditListPanelState } from "@/components/admin/cms/CmsEditListPanel.vue";
import { useCmsRemove } from "@/composables/useCmsRemove";
import { useCmsTagGrid } from "@/composables/useCmsTagGrid";
import { useDarkMode } from "@/composables/useDarkMode";
import { detectLanguage, i18n, type SupportedLang } from "@/i18n";
import { createTag, deleteTag, getAllTags, getTagTypes, updateTag } from "@/services/tags";
import { localizeOrEmpty, type LanguageMap } from "@/utils/language-utils";
import {
  applyUpdatedTagToRow,
  buildEmptyTagForm,
  buildTagGridRows,
  toLanguageMap,
  makeEditorValues,
  toLanguageMapOrNull,
  validateCreateTagForm,
  type CmsTagGridRow,
  type CreateTagFormState,
  type EditorPanelState,
} from "@/services/cms";

const { t } = useI18n();
const { isDark } = useDarkMode();

const {
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
  persistGridState,
  gridApi,
} = useCmsTagGrid({
  isDark,
  t,
  getTagTypeLabels: () => tagTypesData.value.map((tt) => localizeValue(tt.name) || `#${tt.id}`),
});

const isLoading = ref(false);
const isSaving = ref(false);
const isCreating = ref(false);
const loadError = ref<string | null>(null);
const saveError = ref<string | null>(null);
const createError = ref<string | null>(null);
const rowData = ref<CmsTagGridRow[]>([]);
const tagsData = ref<Tag[]>([]);
const tagTypesData = ref<TagType[]>([]);
const editorPanel = ref<EditorPanelState | null>(null);
const editProductionsPanel = ref<EditListPanelState | null>(null);

// Tags don't support bulk editing; always 1 so the bulk notice is never shown.
const editorBulkCount = computed(() => 1);

const createModalOpen = ref(false);
const createForm = ref<CreateTagFormState>(buildEmptyTagForm());
const createExtraLangs = ref({ en: false, fr: false });
const visibleCreateLangs = computed<SupportedLang[]>(() => {
  const result: SupportedLang[] = ["nl"];
  if (createExtraLangs.value.en) result.push("en");
  if (createExtraLangs.value.fr) result.push("fr");
  return result;
});
const langGridClass = computed(() => {
  const count = visibleCreateLangs.value.length;
  if (count <= 1) return "cms-lang-grid cms-lang-grid-single";
  if (count === 2) return "cms-lang-grid cms-lang-grid-double";
  return "cms-lang-grid";
});

const currentLang = computed(() => i18n.global.locale.value as SupportedLang);

function localizeValue(map: LanguageMap | null | undefined): string {
  if (!map) {
    return "";
  }
  return localizeOrEmpty(map, currentLang.value);
}

function tagTypeMap(): Map<number, TagType> {
  return new Map(tagTypesData.value.map((type) => [type.id, type]));
}

const {
  removeConfirmOpen,
  removeConfirmLoading,
  removeConfirmError,
  openRemoveConfirm,
  closeRemoveConfirm,
  confirmRemove,
} = useCmsRemove<CmsTagGridRow>({
  selectedCount,
  getSelectedRows: () => gridApi.value?.getSelectedRows() ?? [],
  rowToId: (row) => row.id,
  deleteFn: deleteTag,
  t,
  onSuccess: async () => {
    selectedCount.value = 0;
    gridApi.value?.deselectAll();
    await loadTagsData();
  },
});

// ---------------------------------------------------------------------------
// Editing
// ---------------------------------------------------------------------------

function rebuildRows(): void {
  rowData.value = buildTagGridRows(tagsData.value, tagTypesData.value, localizeValue);
}

async function persistTagPatch(
  row: CmsTagGridRow,
  patch: Parameters<typeof updateTag>[1],
): Promise<void> {
  try {
    const updated = await updateTag(row.id, patch);
    applyUpdatedTagToRow(row, updated, tagTypeMap(), localizeValue);
  } catch (error) {
    saveError.value =
      error instanceof Error
        ? t("cms.errors.saveFailed", { message: error.message })
        : t("cms.errors.saveGeneric");
    throw error;
  }
}

function onCellClicked(event: CellClickedEvent<CmsTagGridRow>): void {
  if (!event.data || !event.colDef.field) return;

  const field = event.colDef.field as "name" | "productions";

  if (field === "productions") {
    openEditProductionsPanel(event.data);
    return;
  }

  if (field !== "name") return;

  const source = tagsData.value.find((p) => p.id === event.data!.id);
  const currentMap = (source?.[field] ?? null) as LanguageMap | null;

  editorPanel.value = {
    rowId: event.data.id,
    apiField: field,
    label: event.colDef.headerName ?? field,
    values: makeEditorValues(currentMap),
  };
  saveError.value = null;
}

async function onCellEditingStopped(
  event: CellEditingStoppedEvent<CmsTagGridRow>,
): Promise<void> {
  if (!event.data || !event.colDef.field) {
    return;
  }

  const field = event.colDef.field;
  const newValue = event.value;
  const oldValue = event.oldValue;

  if (newValue === oldValue) {
    return;
  }

  saveError.value = null;
  isSaving.value = true;

  try {
    if (field === "public") {
      await persistTagPatch(event.data, { public: Boolean(newValue) });
    } else if (field === "tagType") {
      const tagType = tagTypesData.value.find((tt) => localizeValue(tt.name) === newValue || String(tt.id) === newValue);
      if (!tagType) {
        event.node.setDataValue(field, oldValue);
        return;
      }
      await persistTagPatch(event.data, { tag_type: tagType.id });
    } else {
      event.node.setDataValue(field, oldValue);
      return;
    }
  } catch {
    event.node.setDataValue(field, oldValue);
  } finally {
    isSaving.value = false;
    persistGridState();
  }
}

function closeEditorPanel(): void {
  editorPanel.value = null;
  saveError.value = null;
}

async function saveEditorPanel(): Promise<void> {
  if (!editorPanel.value) return;

  const row = rowData.value.find((item) => item.id === editorPanel.value?.rowId);
  if (!row) return;

  const payload = toLanguageMapOrNull(editorPanel.value.values);
  isSaving.value = true;
  saveError.value = null;
  try {
    await persistTagPatch(row, { [editorPanel.value.apiField]: payload });
    await loadTagsData();
    closeEditorPanel();
  } finally {
    isSaving.value = false;
  }
}

// ---------------------------------------------------------------------------
// Edit productions panel (Edit list panel)
// ---------------------------------------------------------------------------

function openEditProductionsPanel(
  row: CmsTagGridRow,
): void {
  const source = tagsData.value.find(
    (t) => t.id === row.id,
  );

  const lang = detectLanguage();

  editProductionsPanel.value = {
    rowId: row.id,
    label: t("cms.columns.blogpost.productions"),
    items: [...(source?.productions as number[] ?? [])],
    urlBase: `/${lang}/productions`,
  };

  saveError.value = null;
}

function closeEditProductionsPanel(): void {
  editProductionsPanel.value = null;
  saveError.value = null;
}

async function saveEditProductionsPanel(): Promise<void> {
  if (!editProductionsPanel.value) return;

  const row = rowData.value.find(
    (item) => item.id === editProductionsPanel.value?.rowId,
  );

  if (!row) return;

  isSaving.value = true;
  saveError.value = null;

  try {
    await persistTagPatch(row, { productions: editProductionsPanel.value.items });
    await loadTagsData();
    closeEditProductionsPanel();
  } finally {
    isSaving.value = false;
  }
}

// ---------------------------------------------------------------------------
// Create modal
// ---------------------------------------------------------------------------

function resetCreateForm(): void {
  createForm.value = buildEmptyTagForm();
  createExtraLangs.value = { en: false, fr: false };
}

function openCreateModal(): void {
  createError.value = null;
  if (createForm.value.tagTypeId === null && tagTypesData.value.length > 0) {
    createForm.value.tagTypeId = tagTypesData.value[0].id;
  }
  createModalOpen.value = true;
}

function closeCreateModal(): void {
  createModalOpen.value = false;
  createError.value = null;
  resetCreateForm();
}

function setCreateName(lang: SupportedLang, value: string): void {
  createForm.value = {
    ...createForm.value,
    name: { ...createForm.value.name, [lang]: value },
  };
}

function setCreateTagType(id: number | null): void {
  createForm.value = { ...createForm.value, tagTypeId: id };
}

function setCreatePublic(value: boolean): void {
  createForm.value = { ...createForm.value, public: value };
}

function setCreateExtraLang(lang: "en" | "fr", value: boolean): void {
  createExtraLangs.value = { ...createExtraLangs.value, [lang]: value };
}

async function submitCreateTag(): Promise<void> {
  const validationError = validateCreateTagForm(createForm.value, t);
  if (validationError) {
    createError.value = validationError;
    return;
  }

  isCreating.value = true;
  createError.value = null;
  try {
    await createTag({
      old_id: null,
      name: toLanguageMap(createForm.value.name),
      tag_type: createForm.value.tagTypeId as number,
      public: createForm.value.public,
      productions: [],
    });
    await loadTagsData();
    closeCreateModal();
  } catch (error) {
    createError.value =
      error instanceof Error
        ? t("cms.errors.saveFailed", { message: error.message })
        : t("cms.errors.saveGeneric");
  } finally {
    isCreating.value = false;
  }
}

async function loadTagsData(): Promise<void> {
  isLoading.value = true;
  loadError.value = null;

  try {
    const [tags, tagTypes] = await Promise.all([
      getAllTags(undefined, { includeProductions: true }),
      getTagTypes(),
    ]);
    tagsData.value = tags;
    tagTypesData.value = tagTypes;
    rebuildRows();
  } catch (error) {
    loadError.value =
      error instanceof Error
        ? t("cms.errors.loadFailed", { message: error.message })
        : t("cms.errors.loadGeneric");
  } finally {
    isLoading.value = false;
  }
}

defineExpose({
  __test: {
    rowData,
    tagsData,
    tagTypesData,
    loadError,
    saveError,
    isLoading,
    isSaving,
    isCreating,
    createError,
    createModalOpen,
    createForm,
    createExtraLangs,
    loadTagsData,
    rebuildRows,
    localizeValue,
    onCellEditingStopped,
    onCellClicked,
    editProductionsPanel,
    openEditProductionsPanel,
    closeEditProductionsPanel,
    saveEditProductionsPanel,
    editorPanel,
    closeEditorPanel,
    saveEditorPanel,
    openCreateModal,
    closeCreateModal,
    submitCreateTag,
    resetCreateForm,
    setCreateName,
    setCreateTagType,
    setCreatePublic,
    setCreateExtraLang,
    removeConfirmOpen,
    removeConfirmLoading,
    removeConfirmError,
    openRemoveConfirm,
    closeRemoveConfirm,
    confirmRemove,
    selectedCount,
    gridApi,
  },
});

watch(currentLang, () => {
  rebuildRows();
});

onMounted(() => {
  void loadTagsData();
});

onBeforeUnmount(() => {
  persistGridState();
});
</script>
