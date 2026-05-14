<template>
  <CmsTabShell
    v-model:quick-filter-text="quickFilterText"
    v-model:column-chooser-open="columnChooserOpen"
    :row-count="rowData.length"
    loaded-count-key="cms.blogposts.loadedCount"
    empty-state-key="cms.blogposts.noPosts"
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
        :undo-redo-cell-editing="true"
        :undo-redo-cell-editing-limit="25"
        :value-cache="true"
        :cache-quick-filter="true"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @cell-editing-stopped="onCellEditingStopped"
      />
    </template>
  </CmsTabShell>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import type { CellEditingStoppedEvent } from "ag-grid-community";
import { useI18n } from "vue-i18n";
import type { BlogPostWithBackwardsRefs } from "@viernulvier/shared";
import CmsTabShell from "@/components/admin/cms/CmsTabShell.vue";
import { useCmsBlogPostGrid } from "@/composables/useCmsBlogPostGrid";
import { useDarkMode } from "@/composables/useDarkMode";
import { i18n, type SupportedLang } from "@/i18n";
import { getBlogPosts, updateBlogPost } from "@/services/blogposts";
import { localizeOrEmpty, type LanguageMap } from "@/utils/language-utils";
import {
  applyUpdatedBlogPostToRow,
  buildBlogPostGridRows,
  type CmsBlogPostGridRow,
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
} = useCmsBlogPostGrid({ isDark, t });

const isLoading = ref(false);
const isSaving = ref(false);
const loadError = ref<string | null>(null);
const saveError = ref<string | null>(null);
const rowData = ref<CmsBlogPostGridRow[]>([]);
const blogpostsData = ref<BlogPostWithBackwardsRefs[]>([]);

// ---------------------------------------------------------------------------
// Localisation helpers
// ---------------------------------------------------------------------------

const currentLang = computed(() => i18n.global.locale.value as SupportedLang);

function localizeValue(map: LanguageMap | null | undefined): string {
  if (!map) return "";
  return localizeOrEmpty(map, currentLang.value);
}

function rebuildRows(): void {
  rowData.value = buildBlogPostGridRows(blogpostsData.value, localizeValue);
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

async function loadBlogPostsData(): Promise<void> {
  isLoading.value = true;
  loadError.value = null;

  try {
    blogpostsData.value = await getBlogPosts();
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
// Inline cell editing
// ---------------------------------------------------------------------------

async function persistBlogPostPatch(
  row: CmsBlogPostGridRow,
  patch: Parameters<typeof updateBlogPost>[1],
): Promise<void> {
  try {
    const updated = await updateBlogPost(row.id, patch);
    applyUpdatedBlogPostToRow(row, updated, localizeValue);
  } catch (error) {
    saveError.value =
      error instanceof Error
        ? t("cms.errors.saveFailed", { message: error.message })
        : t("cms.errors.saveGeneric");
    throw error;
  }
}

async function onCellEditingStopped(
  event: CellEditingStoppedEvent<CmsBlogPostGridRow>,
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
    if (field === "title" || field === "content") {
      const trimmed = String(newValue ?? "").trim();
      if (!trimmed) {
        event.node.setDataValue(field, oldValue);
        return;
      }
      const currentMap = (blogpostsData.value.find((p) => p.id === event.data!.id)?.[field] ?? {}) as LanguageMap;
      const nextMap: LanguageMap = { ...currentMap, [currentLang.value]: trimmed };
      await persistBlogPostPatch(event.data, { [field]: nextMap });
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

// ---------------------------------------------------------------------------
// Expose internals for testing
// ---------------------------------------------------------------------------

defineExpose({
  __test: {
    rowData,
    postsData: blogpostsData,
    loadError,
    saveError,
    isLoading,
    isSaving,
    loadBlogPostsData,
    rebuildRows,
    localizeValue,
    onCellEditingStopped,
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
  void loadBlogPostsData();
});

onBeforeUnmount(() => {
  persistGridState();
});
</script>