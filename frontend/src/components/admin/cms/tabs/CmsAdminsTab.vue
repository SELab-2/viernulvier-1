<template>
  <div class="cms-tab-content">
    <div
      v-if="!isSuper"
      class="rounded-lg border border-surface-3 bg-surface-0 px-4 py-3 text-sm text-ink-secondary"
    >
      {{ t("cms.admin.noPermission") }}
    </div>

    <template v-else>
      <div class="flex items-center justify-between">
        <p class="text-xs text-ink-tertiary">
          {{ t("cms.actions.loadedCount", { count: rowData.length }) }}
        </p>

        <button type="button" class="cms-add-button" data-testid="cms-add-admin" @click="openCreateModal">
          {{ t("cms.actions.admin.addAdmin") }}
        </button>
      </div>

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
        {{ t("cms.actions.admin.noAdmins") }}
      </p>

      <CmsCreateAdminModal
        :open="createModalOpen"
        :create-form="createForm"
        :create-error="createError"
        :is-creating="isCreating"
        @close="closeCreateModal"
        @submit="submitCreateAdmin"
        @update-username="setCreateUsername"
        @update-password="setCreatePassword"
        @update-super="setCreateSuper"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import type { CellEditingStoppedEvent } from "ag-grid-community";
import { useI18n } from "vue-i18n";
import CmsColumnChooser from "@/components/admin/cms/CmsColumnChooser.vue";
import CmsGridControls from "@/components/admin/cms/CmsGridControls.vue";
import CmsCreateAdminModal from "@/components/admin/cms/admins/CmsCreateAdminModal.vue";
import { useCmsAdminGrid } from "@/composables/useCmsAdminGrid";
import { useDarkMode } from "@/composables/useDarkMode";
import { useAuthStore } from "@/stores/auth";
import { getAllAdmins, updateAdmin, createAdmin } from "@/services/auth";
import {
  applyUpdatedAdminToRow,
  buildAdminGridRows,
  buildEmptyAdminForm,
  type CmsAdminGridRow,
  type CreateAdminFormState,
} from "@/services/cms";

const { t } = useI18n();
const { isDark } = useDarkMode();
const { admin } = useAuthStore();

const isSuper = computed(() => admin?.super ?? false);

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
} = useCmsAdminGrid({ isDark, t });

const isLoading = ref(false);
const isSaving = ref(false);
const isCreating = ref(false);
const loadError = ref<string | null>(null);
const saveError = ref<string | null>(null);
const createError = ref<string | null>(null);
const rowData = ref<CmsAdminGridRow[]>([]);

const createModalOpen = ref(false);
const createForm = ref<CreateAdminFormState>(buildEmptyAdminForm());

async function persistAdminPatch(
  row: CmsAdminGridRow,
  patch: Parameters<typeof updateAdmin>[1],
): Promise<void> {
  try {
    const updated = await updateAdmin(row.id, patch);
    applyUpdatedAdminToRow(row, updated);
  } catch (error) {
    saveError.value =
      error instanceof Error
        ? t("cms.errors.saveFailed", { message: error.message })
        : t("cms.errors.saveGeneric");
    throw error;
  }
}

async function onCellEditingStopped(
  event: CellEditingStoppedEvent<CmsAdminGridRow>,
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
    if (field === "username") {
      const trimmed = String(newValue ?? "").trim();
      if (!trimmed) {
        event.node.setDataValue(field, oldValue);
        return;
      }
      await persistAdminPatch(event.data, { username: trimmed });
    } else if (field === "super") {
      await persistAdminPatch(event.data, { super: Boolean(newValue) });
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
  createForm.value = buildEmptyAdminForm();
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

function setCreateUsername(value: string): void {
  createForm.value = { ...createForm.value, username: value };
}

function setCreatePassword(value: string): void {
  createForm.value = { ...createForm.value, password: value };
}

function setCreateSuper(value: boolean): void {
  createForm.value = { ...createForm.value, super: value };
}

async function submitCreateAdmin(): Promise<void> {
  isCreating.value = true;
  createError.value = null;

  try {
    await createAdmin({
      username: createForm.value.username.trim(),
      password: createForm.value.password,
      super: createForm.value.super,
    });
    await loadAdminsData();
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

async function loadAdminsData(): Promise<void> {
  isLoading.value = true;
  loadError.value = null;

  try {
    const admins = await getAllAdmins();
    rowData.value = buildAdminGridRows(admins);
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
    loadError,
    saveError,
    isLoading,
    isSaving,
    isCreating,
    createError,
    createModalOpen,
    createForm,
    quickFilterText,
    columnChooserOpen,
    loadAdminsData,
    onCellEditingStopped,
    openCreateModal,
    closeCreateModal,
    submitCreateAdmin,
    resetCreateForm,
    setCreateUsername,
    setCreatePassword,
    setCreateSuper,
  },
});

onMounted(() => {
  if (isSuper.value) {
    void loadAdminsData();
  }
});

onBeforeUnmount(() => {
  persistGridState();
});
</script>