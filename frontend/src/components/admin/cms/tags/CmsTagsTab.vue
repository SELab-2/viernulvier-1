<template>
  <CmsTabShell
    v-model:quick-filter-text="quickFilterText"
    v-model:column-chooser-open="columnChooserOpen"
    :row-count="rowData.length"
    loaded-count-key="cms.actions.loadedTagsCount"
    empty-state-key="cms.actions.noTags"
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
      <button type="button" class="cms-add-button" data-testid="cms-add-tag" @click="openCreateModal">
        {{ t("cms.actions.addTag") }}
      </button>
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
      />
    </template>

    <template #modals>
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
    </template>
  </CmsTabShell>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import type { CellEditingStoppedEvent } from "ag-grid-community";
import { useI18n } from "vue-i18n";
import type { Tag, TagType } from "@viernulvier/shared";
import CmsTabShell from "@/components/admin/cms/CmsTabShell.vue";
import CmsCreateTagModal from "@/components/admin/cms/tags/CmsCreateTagModal.vue";
import { useCmsTagGrid } from "@/composables/useCmsTagGrid";
import { useDarkMode } from "@/composables/useDarkMode";
import { i18n, type SupportedLang } from "@/i18n";
import { createTag, getAllTags, getTagTypes, updateTag } from "@/services/tags";
import { localizeOrEmpty, type LanguageMap } from "@/utils/language-utils";
import {
  applyUpdatedTagToRow,
  buildEmptyTagForm,
  buildTagGridRows,
  toLanguageMap,
  validateCreateTagForm,
  type CmsTagGridRow,
  type CreateTagFormState,
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
} = useCmsTagGrid({ isDark, t });

const isLoading = ref(false);
const isSaving = ref(false);
const isCreating = ref(false);
const loadError = ref<string | null>(null);
const saveError = ref<string | null>(null);
const createError = ref<string | null>(null);
const rowData = ref<CmsTagGridRow[]>([]);
const tagsData = ref<Tag[]>([]);
const tagTypesData = ref<TagType[]>([]);

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
    if (field === "name") {
      const trimmed = String(newValue ?? "").trim();
      const currentMap = (event.data.source.name ?? {}) as LanguageMap;
      const nextMap: LanguageMap = { ...currentMap, [currentLang.value]: trimmed };
      await persistTagPatch(event.data, { name: nextMap });
    } else if (field === "public") {
      await persistTagPatch(event.data, { public: Boolean(newValue) });
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
    const [tags, tagTypes] = await Promise.all([getAllTags(), getTagTypes()]);
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
    openCreateModal,
    closeCreateModal,
    submitCreateTag,
    resetCreateForm,
    setCreateName,
    setCreateTagType,
    setCreatePublic,
    setCreateExtraLang,
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
