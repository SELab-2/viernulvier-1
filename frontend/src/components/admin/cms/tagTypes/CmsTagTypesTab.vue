<template>
  <CmsTabShell
    v-model:quick-filter-text="quickFilterText"
    v-model:column-chooser-open="columnChooserOpen"
    :row-count="rowData.length"
    loaded-count-key="cms.actions.loadedTagTypesCount"
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
        <button type="button" class="cms-add-button" data-testid="cms-add-tag-type" @click="openCreateModal">
          {{ t("cms.actions.addTagType") }}
        </button>
        <button
          type="button"
          class="cms-remove-button"
          data-testid="cms-remove-tag-types"
          :disabled="selectedCount === 0"
          @click="openRemoveConfirm"
        >
          {{ t("cms.actions.removeTagType") }}
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
        :suppress-row-click-selection="false"
        :column-hover-highlight="true"
        :enable-cell-text-selection="true"
        :ensure-dom-order="true"
        :value-cache="true"
        :cache-quick-filter="true"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @cell-clicked="onCellClicked"
      />
    </template>

    <template #modals>
      <CmsRemoveConfirmModal
        v-if="removeConfirmOpen"
        :is-loading="removeConfirmLoading"
        :error="removeConfirmError"
        :count="selectedCount"
        title-key="cms.actions.tagType.confirmRemoveDialogTitle"
        body-key="cms.actions.tagType.confirmRemoveBody"
        @close="closeRemoveConfirm"
        @confirm="confirmRemove"
      />

      <CmsCreateTagTypeModal
        :open="createModalOpen"
        :create-form="createForm"
        :create-extra-langs="createExtraLangs"
        :visible-create-langs="visibleCreateLangs"
        :lang-grid-class="langGridClass"
        :create-error="createError"
        :is-creating="isCreating"
        @close="closeCreateModal"
        @submit="submitCreateTagType"
        @update-name="setCreateName"
        @update-extra-lang="setCreateExtraLang"
      />

      <CmsEditorPanel
        v-model:panel="editorPanel"
        :bulk-count="1"
        :save-error="saveError"
        :is-saving="isSaving"
        @close="closeEditorPanel"
        @save="saveEditorPanel"
      />

      <CmsEditListPanel
        v-model:panel="editTagsPanel"
        :save-error="saveError"
        :is-saving="isSaving"
        @close="closeEditTagsPanel"
        @save="saveEditTagsPanel"
      />
    </template>
  </CmsTabShell>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import type { CellClickedEvent } from "ag-grid-community";
import { useI18n } from "vue-i18n";
import type { Tag, TagType } from "@viernulvier/shared";
import CmsTabShell from "@/components/admin/cms/CmsTabShell.vue";
import CmsRemoveConfirmModal from "@/components/admin/cms/CmsRemoveConfirmModal.vue";
import CmsEditorPanel from "@/components/admin/cms/CmsEditorPanel.vue";
import CmsEditListPanel, { type EditListPanelState } from "@/components/admin/cms/CmsEditListPanel.vue";
import CmsCreateTagTypeModal from "@/components/admin/cms/tagTypes/CmsCreateTagTypeModal.vue";
import { useCmsRemove } from "@/composables/useCmsRemove";
import { useCmsTagTypeGrid } from "@/composables/useCmsTagTypeGrid";
import { useDarkMode } from "@/composables/useDarkMode";
import { i18n, type SupportedLang } from "@/i18n";
import { createTagType, deleteTagType, getAllTags, getTagTypes, updateTag, updateTagType } from "@/services/tags";
import { localizeWithFallback, localizeOrEmpty, type LanguageMap } from "@/utils/language-utils";
import {
  applyUpdatedTagTypeToRow,
  buildEmptyTagTypeForm,
  buildTagTypeGridRows,
  makeEditorValues,
  toLanguageMapOrNull,
  toLanguageMap,
  validateCreateTagTypeForm,
  type CmsTagTypeGridRow,
  type CreateTagTypeFormState,
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
} = useCmsTagTypeGrid({ isDark, t });

const isLoading = ref(false);
const isSaving = ref(false);
const isCreating = ref(false);
const loadError = ref<string | null>(null);
const saveError = ref<string | null>(null);
const createError = ref<string | null>(null);
const rowData = ref<CmsTagTypeGridRow[]>([]);
const tagTypesData = ref<TagType[]>([]);
const tagsData = ref<Tag[]>([]);

// ---------------------------------------------------------------------------
// Editor panel (multilingual name)
// ---------------------------------------------------------------------------

const editorPanel = ref<EditorPanelState | null>(null);

function openEditorPanel(row: CmsTagTypeGridRow, headerName: string): void {
  const source = tagTypesData.value.find((tt) => tt.id === row.id);
  editorPanel.value = {
    rowId: row.id,
    apiField: "name",
    label: headerName,
    values: makeEditorValues(source?.name as LanguageMap | null | undefined),
  };
  saveError.value = null;
}

function closeEditorPanel(): void {
  editorPanel.value = null;
  saveError.value = null;
}

async function saveEditorPanel(): Promise<void> {
  if (!editorPanel.value) return;

  const row = rowData.value.find((r) => r.id === editorPanel.value?.rowId);
  if (!row) return;

  const payload = toLanguageMapOrNull(editorPanel.value.values);
  isSaving.value = true;
  saveError.value = null;

  try {
    const updated = await updateTagType(row.id, { name: payload ?? {} });
    applyUpdatedTagTypeToRow(row, updated, localizeValue);
    closeEditorPanel();
  } catch (error) {
    saveError.value =
      error instanceof Error
        ? t("cms.errors.saveFailed", { message: error.message })
        : t("cms.errors.saveGeneric");
  } finally {
    isSaving.value = false;
  }
}

// ---------------------------------------------------------------------------
// Edit tags panel (lists tag IDs belonging to this type)
// ---------------------------------------------------------------------------

const editTagsPanel = ref<EditListPanelState | null>(null);

function openEditTagsPanel(row: CmsTagTypeGridRow): void {
  editTagsPanel.value = {
    rowId: row.id,
    label: t("cms.columns.tagsInType"),
    items: [...row.tags],
  };
  saveError.value = null;
}

function closeEditTagsPanel(): void {
  editTagsPanel.value = null;
  saveError.value = null;
}

/**
 * Saves the tags panel.
 *
 * Only "additions" are persisted: tag IDs that are in the panel but were not
 * previously assigned to this type will be reassigned via PATCH.
 * Removing a tag from the panel UI has no server-side effect — you cannot
 * unassign a tag from its type without assigning it to another one.
 */
async function saveEditTagsPanel(): Promise<void> {
  if (!editTagsPanel.value) return;

  const tagTypeId = editTagsPanel.value.rowId;
  const originalTagIds = new Set(
    tagsData.value
      .filter((tag) => Number(tag.tag_type) === tagTypeId)
      .map((tag) => tag.id),
  );

  const newTagIds = editTagsPanel.value.items.filter((id) => !originalTagIds.has(id));

  if (newTagIds.length === 0) {
    closeEditTagsPanel();
    return;
  }

  isSaving.value = true;
  saveError.value = null;

  try {
    await Promise.all(newTagIds.map((id) => updateTag(id, { tag_type: tagTypeId })));
    await loadData();
    closeEditTagsPanel();
  } catch (error) {
    saveError.value =
      error instanceof Error
        ? t("cms.errors.saveFailed", { message: error.message })
        : t("cms.errors.saveGeneric");
  } finally {
    isSaving.value = false;
  }
}

// ---------------------------------------------------------------------------
// Cell interactions
// ---------------------------------------------------------------------------

function onCellClicked(event: CellClickedEvent<CmsTagTypeGridRow>): void {
  if (!event.data || !event.colDef.field) return;

  if (event.colDef.field === "name") {
    openEditorPanel(event.data, event.colDef.headerName ?? t("cms.columns.tagTypeName"));
    return;
  }

  if (event.colDef.field === "tags") {
    openEditTagsPanel(event.data);
  }
}

// ---------------------------------------------------------------------------
// Localisation helpers
// ---------------------------------------------------------------------------

const currentLang = computed(() => i18n.global.locale.value as SupportedLang);

function localizeValue(map: LanguageMap | null | undefined): string {
  if (!map) return "";
  return localizeWithFallback(map, (map) => localizeOrEmpty(map, currentLang.value));
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

function rebuildRows(): void {
  rowData.value = buildTagTypeGridRows(tagTypesData.value, tagsData.value, localizeValue);
}

async function loadData(): Promise<void> {
  isLoading.value = true;
  loadError.value = null;

  try {
    const [tagTypes, tags] = await Promise.all([getTagTypes(), getAllTags()]);
    tagTypesData.value = tagTypes;
    tagsData.value = tags;
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

// ---------------------------------------------------------------------------
// Create modal
// ---------------------------------------------------------------------------

const createModalOpen = ref(false);
const createForm = ref<CreateTagTypeFormState>(buildEmptyTagTypeForm());
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

function resetCreateForm(): void {
  createForm.value = buildEmptyTagTypeForm();
  createExtraLangs.value = { en: false, fr: false };
}

function openCreateModal(): void {
  createError.value = null;
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

function setCreateExtraLang(lang: "en" | "fr", value: boolean): void {
  createExtraLangs.value = { ...createExtraLangs.value, [lang]: value };
}

async function submitCreateTagType(): Promise<void> {
  const validationError = validateCreateTagTypeForm(createForm.value, t);
  if (validationError) {
    createError.value = validationError;
    return;
  }

  isCreating.value = true;
  createError.value = null;

  try {
    await createTagType({ name: toLanguageMap(createForm.value.name) });
    await loadData();
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

// ---------------------------------------------------------------------------
// Removal
// ---------------------------------------------------------------------------

const {
  removeConfirmOpen,
  removeConfirmLoading,
  removeConfirmError,
  openRemoveConfirm,
  closeRemoveConfirm,
  confirmRemove,
} = useCmsRemove<CmsTagTypeGridRow>({
  selectedCount,
  getSelectedRows: () => gridApi.value?.getSelectedRows() ?? [],
  rowToId: (row) => row.id,
  deleteFn: deleteTagType,
  t,
  onSuccess: async () => {
    selectedCount.value = 0;
    gridApi.value?.deselectAll();
    await loadData();
  },
});

// ---------------------------------------------------------------------------
// Expose internals for testing
// ---------------------------------------------------------------------------

defineExpose({
  __test: {
    rowData,
    tagTypesData,
    tagsData,
    loadError,
    saveError,
    isLoading,
    isSaving,
    isCreating,
    createError,
    createModalOpen,
    createForm,
    createExtraLangs,
    loadData,
    rebuildRows,
    localizeValue,
    onCellClicked,
    openCreateModal,
    closeCreateModal,
    submitCreateTagType,
    resetCreateForm,
    setCreateName,
    setCreateExtraLang,
    editorPanel,
    openEditorPanel,
    closeEditorPanel,
    saveEditorPanel,
    editTagsPanel,
    openEditTagsPanel,
    closeEditTagsPanel,
    saveEditTagsPanel,
    removeConfirmOpen,
    removeConfirmLoading,
    removeConfirmError,
    openRemoveConfirm,
    closeRemoveConfirm,
    confirmRemove,
    selectedCount,
    gridApi,
    persistGridState,
  },
});

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

watch(currentLang, () => {
  rebuildRows();
});

onMounted(() => {
  void loadData();
});

onBeforeUnmount(() => {
  persistGridState();
});
</script>
