<template>
  <CmsTabShell
    v-model:quick-filter-text="quickFilterText"
    v-model:column-chooser-open="columnChooserOpen"
    :row-count="rowData.length"
    loaded-count-key="cms.actions.loadedCount"
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
        <button type="button" class="cms-add-button" data-testid="cms-add-blogpost" @click="openCreateModal">
          {{ t("cms.actions.blogpost.addBlogpost") }}
        </button>
        <button
          type="button"
          class="cms-remove-button"
          data-testid="cms-remove-blogposts"
          :disabled="selectedCount === 0"
          @click="openRemoveConfirm"
        >
          {{ t("cms.actions.blogpost.removeBlogpost") }}
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
        :undo-redo-cell-editing="true"
        :undo-redo-cell-editing-limit="25"
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
        title-key="cms.actions.blogpost.confirmRemoveDialogTitle"
        body-key="cms.actions.blogpost.confirmRemoveBody"
        @close="closeRemoveConfirm"
        @confirm="confirmRemove"
      />

      <CmsCreateBlogPostModal
        :open="createModalOpen"
        :create-form="createForm"
        :create-extra-langs="createExtraLangs"
        :visible-create-langs="visibleCreateLangs"
        :lang-grid-class="langGridClass"
        :create-error="createError"
        :is-creating="isCreating"
        @close="closeCreateModal"
        @submit="submitCreateBlogPost"
        @update-title="setCreateTitle"
        @update-content="setCreateContent"
        @update-extra-lang="setCreateExtraLang"
        @add-production-id="addProductionId"
        @remove-production-id="removeProductionId"
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
        @close="closeProductionsPanel"
        @save="saveProductionsPanel"
      />
    </template>
  </CmsTabShell>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import type { CellClickedEvent } from "ag-grid-community";
import { useI18n } from "vue-i18n";
import type { BlogPostWithBackwardsRefs } from "@viernulvier/shared";
import CmsTabShell from "@/components/admin/cms/CmsTabShell.vue";
import CmsRemoveConfirmModal from "@/components/admin/cms/CmsRemoveConfirmModal.vue";
import CmsCreateBlogPostModal from "@/components/admin/cms/blogposts/CmsCreateBlogPostModal.vue";
import CmsEditorPanel from "@/components/admin/cms/CmsEditorPanel.vue";
import CmsEditListPanel, { type EditListPanelState } from "@/components/admin/cms/CmsEditListPanel.vue";
import { useCmsBlogPostGrid } from "@/composables/useCmsBlogPostGrid";
import { useCmsRemove } from "@/composables/useCmsRemove";
import { useDarkMode } from "@/composables/useDarkMode";
import { i18n, type SupportedLang } from "@/i18n";
import { getBlogPosts, createBlogPost, updateBlogPost, deleteBlogPost } from "@/services/blogposts";
import { localizeOrEmpty, type LanguageMap } from "@/utils/language-utils";
import {
  applyUpdatedBlogPostToRow,
  buildBlogPostGridRows,
  buildEmptyBlogPostForm,
  makeEditorValues,
  toLanguageMapOrNull,
  validateCreateBlogPostForm,
  type CmsBlogPostGridRow,
  type CreateBlogPostFormState,
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
} = useCmsBlogPostGrid({ isDark, t });

const isLoading = ref(false);
const isSaving = ref(false);
const isCreating = ref(false);
const loadError = ref<string | null>(null);
const saveError = ref<string | null>(null);
const createError = ref<string | null>(null);
const rowData = ref<CmsBlogPostGridRow[]>([]);
const blogpostsData = ref<BlogPostWithBackwardsRefs[]>([]);
const editorPanel = ref<EditorPanelState | null>(null);
const editProductionsPanel = ref<EditListPanelState | null>(null);

// Blog posts don't support bulk editing; always 1 so the bulk notice is never shown.
const editorBulkCount = computed(() => 1);

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
// Editor panel (title / content)
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

function onCellClicked(event: CellClickedEvent<CmsBlogPostGridRow>): void {
  if (!event.data || !event.colDef.field) return;

  const field = event.colDef.field as "title" | "content" | "productions";

  if (field === "productions") {
    openProductionsPanel(event.data);
    return;
  }

  if (field !== "title" && field !== "content") return;

  const source = blogpostsData.value.find((p) => p.id === event.data!.id);
  const currentMap = (source?.[field] ?? null) as LanguageMap | null;

  editorPanel.value = {
    rowId: event.data.id,
    apiField: field,
    label: event.colDef.headerName ?? field,
    values: makeEditorValues(currentMap),
  };
  saveError.value = null;
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
    await persistBlogPostPatch(row, { [editorPanel.value.apiField]: payload });
    await loadBlogPostsData();
    closeEditorPanel();
  } finally {
    isSaving.value = false;
  }
}

// ---------------------------------------------------------------------------
// Edit productions panel (Edit list panel)
// ---------------------------------------------------------------------------

function openProductionsPanel(
  row: CmsBlogPostGridRow,
): void {
  const source = blogpostsData.value.find(
    (p) => p.id === row.id,
  );

  editProductionsPanel.value = {
    rowId: row.id,
    label: t("cms.panel.productions"),
    items: [...(source?.productions as number[] ?? [])],
  };

  saveError.value = null;
}

function closeProductionsPanel(): void {
  editProductionsPanel.value = null;
  saveError.value = null;
}

async function saveProductionsPanel(): Promise<void> {
  if (!editProductionsPanel.value) return;

  const row = rowData.value.find(
    (item) => item.id === editProductionsPanel.value?.rowId,
  );

  if (!row) return;

  isSaving.value = true;
  saveError.value = null;

  try {
    await persistBlogPostPatch(row, { productions: editProductionsPanel.value.items });
    await loadBlogPostsData();
    closeProductionsPanel();
  } finally {
    isSaving.value = false;
  }
}

// ---------------------------------------------------------------------------
// Create modal
// ---------------------------------------------------------------------------

const createModalOpen = ref(false);
const createForm = ref<CreateBlogPostFormState>(buildEmptyBlogPostForm());
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
  createForm.value = buildEmptyBlogPostForm();
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

function setCreateTitle(lang: SupportedLang, value: string): void {
  createForm.value = {
    ...createForm.value,
    title: { ...createForm.value.title, [lang]: value },
  };
}

function setCreateContent(lang: SupportedLang, value: string): void {
  createForm.value = {
    ...createForm.value,
    content: { ...createForm.value.content, [lang]: value },
  };
}

function setCreateExtraLang(lang: "en" | "fr", value: boolean): void {
  createExtraLangs.value = { ...createExtraLangs.value, [lang]: value };
}

function addProductionId(id: number): void {
  if (createForm.value.productions.includes(id)) {
    return;
  }

  createForm.value = {
    ...createForm.value,
    productions: [...createForm.value.productions, id],
  };
}

function removeProductionId(id: number): void {
  createForm.value = {
    ...createForm.value,
    productions: createForm.value.productions.filter((x) => x !== id),
  };
}

async function submitCreateBlogPost(): Promise<void> {
  const validationError = validateCreateBlogPostForm(createForm.value, t);
  if (validationError) {
    createError.value = validationError;
    return;
  }

  isCreating.value = true;
  createError.value = null;

  try {
    await createBlogPost({
      blog: 1,
      title: createForm.value.title,
      content: createForm.value.content,
      published_at: new Date().toISOString(),
      productions: createForm.value.productions,
    });
    await loadBlogPostsData();
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
} = useCmsRemove<CmsBlogPostGridRow>({
  selectedCount,
  getSelectedRows: () => gridApi.value?.getSelectedRows() ?? [],
  rowToId: (row) => row.id,
  deleteFn: deleteBlogPost,
  t,
  onSuccess: async () => {
    selectedCount.value = 0;
    gridApi.value?.deselectAll();
    await loadBlogPostsData();
  },
});

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
    isCreating,
    createError,
    createModalOpen,
    createForm,
    createExtraLangs,
    loadBlogPostsData,
    rebuildRows,
    localizeValue,
    editorPanel,
    editorBulkCount,
    onCellClicked,
    closeEditorPanel,
    saveEditorPanel,
    productionsPanel: editProductionsPanel,
    openProductionsPanel,
    closeProductionsPanel,
    saveProductionsPanel,
    openCreateModal,
    closeCreateModal,
    submitCreateBlogPost,
    resetCreateForm,
    setCreateTitle,
    setCreateContent,
    setCreateExtraLang,
    addProductionId,
    removeProductionId,
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
  void loadBlogPostsData();
});

onBeforeUnmount(() => {
  persistGridState();
});
</script>