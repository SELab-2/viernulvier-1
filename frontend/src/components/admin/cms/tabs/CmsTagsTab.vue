<template>
  <div class="cms-tab-content">
    <p class="text-xs text-ink-tertiary">
      {{ t("cms.actions.loadedTagsCount", { count: rowData.length }) }}
    </p>

    <CmsGridControls
      :quick-filter-text="quickFilterText"
      :selected-count="selectedCount"
      :column-chooser-open="columnChooserOpen"
      @update:quick-filter-text="quickFilterText = $event"
      @apply-quick-filter="applyQuickFilter"
      @fit-columns="fitGridColumns"
      @auto-size-columns="autoSizeGridColumns"
      @reset-filters="resetGridFilters"
      @export-csv="exportGridCsv"
      @reset-state="resetGridState"
      @toggle-columns="columnChooserOpen = !columnChooserOpen"
    />

    <div
      v-if="loadError"
      class="rounded-lg border border-red-400/40 bg-red-400/10 p-4 text-sm text-red-700"
    >
      {{ loadError }}
    </div>

    <div v-else class="cms-grid-shell">
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
        :undo-redo-cell-editing="true"
        :undo-redo-cell-editing-limit="25"
        :value-cache="true"
        :cache-quick-filter="true"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @cell-editing-stopped="onCellEditingStopped"
      />
    </div>

    <CmsColumnChooser
      :show="columnChooserOpen && !loadError"
      :column-options="gridColumnOptions"
      :column-visibility="columnVisibility"
      @close="columnChooserOpen = false"
      @set-column-visibility="setGridColumnVisibility"
    />

    <p
      v-if="saveError"
      class="rounded-md border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm text-red-700"
    >
      {{ saveError }}
    </p>

    <p
      v-if="!isLoading && !loadError && rowData.length === 0"
      class="rounded-md border border-surface-3 bg-surface-0 px-4 py-3 text-sm text-ink-secondary"
    >
      {{ t("cms.actions.noTags") }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import type { CellEditingStoppedEvent } from "ag-grid-community";
import { useI18n } from "vue-i18n";
import type { Tag, TagType } from "@viernulvier/shared";
import CmsColumnChooser from "@/components/admin/cms/CmsColumnChooser.vue";
import CmsGridControls from "@/components/admin/cms/CmsGridControls.vue";
import { useCmsTagGrid } from "@/composables/useCmsTagGrid";
import { useDarkMode } from "@/composables/useDarkMode";
import { i18n, type SupportedLang } from "@/i18n";
import { getAllTags, getTagTypes, updateTag } from "@/services/tags";
import { localizeOrEmpty, type LanguageMap } from "@/utils/i18n";
import {
  applyUpdatedTagToRow,
  buildTagGridRows,
  type CmsTagGridRow,
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
const loadError = ref<string | null>(null);
const saveError = ref<string | null>(null);
const rowData = ref<CmsTagGridRow[]>([]);
const tagsData = ref<Tag[]>([]);
const tagTypesData = ref<TagType[]>([]);

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
    loadTagsData,
    rebuildRows,
    localizeValue,
    onCellEditingStopped,
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
