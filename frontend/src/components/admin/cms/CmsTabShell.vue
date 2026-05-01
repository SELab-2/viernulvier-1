<template>
  <div class="cms-tab-content">
    <div class="flex items-center justify-between">
      <p class="text-xs text-ink-tertiary">
        {{ t(loadedCountKey, { count: rowCount }) }}
      </p>

      <slot name="header-actions" />
    </div>

    <CmsGridControls
      :quick-filter-text="quickFilterText"
      :selected-count="selectedCount"
      :column-chooser-open="columnChooserOpen"
      @update:quick-filter-text="$emit('update:quickFilterText', $event)"
      @apply-quick-filter="$emit('apply-quick-filter')"
      @fit-columns="$emit('fit-columns')"
      @auto-size-columns="$emit('auto-size-columns')"
      @reset-filters="$emit('reset-filters')"
      @export-csv="$emit('export-csv')"
      @reset-state="$emit('reset-state')"
      @toggle-columns="$emit('update:columnChooserOpen', !columnChooserOpen)"
    />

    <div
      v-if="loadError"
      class="rounded-lg border border-red-400/40 bg-red-400/10 p-4 text-sm text-red-700"
    >
      {{ loadError }}
    </div>

    <slot name="status-banner" />

    <div v-if="!loadError" class="cms-grid-shell">
      <slot name="grid" />
    </div>

    <CmsColumnChooser
      :show="columnChooserOpen && !loadError"
      :column-options="columnOptions"
      :column-visibility="columnVisibility"
      @close="$emit('update:columnChooserOpen', false)"
      @set-column-visibility="(colId, visible) => $emit('set-column-visibility', colId, visible)"
    />

    <p
      v-if="saveError"
      class="rounded-md border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm text-red-700"
    >
      {{ saveError }}
    </p>

    <p
      v-if="!isLoading && !loadError && rowCount === 0"
      class="rounded-md border border-surface-3 bg-surface-0 px-4 py-3 text-sm text-ink-secondary"
    >
      {{ t(emptyStateKey) }}
    </p>

    <slot name="modals" />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import CmsColumnChooser from "@/components/admin/cms/CmsColumnChooser.vue";
import CmsGridControls from "@/components/admin/cms/CmsGridControls.vue";

interface ColumnOption {
  readonly colId: string;
  readonly label: string;
}

defineProps<{
  rowCount: number;
  loadedCountKey: string;
  emptyStateKey: string;
  isLoading: boolean;
  loadError: string | null;
  saveError?: string | null;
  quickFilterText: string;
  selectedCount: number;
  columnChooserOpen: boolean;
  columnOptions: ReadonlyArray<ColumnOption>;
  columnVisibility: Record<string, boolean>;
}>();

defineEmits<{
  (e: "update:quickFilterText", value: string): void;
  (e: "update:columnChooserOpen", value: boolean): void;
  (e: "apply-quick-filter"): void;
  (e: "fit-columns"): void;
  (e: "auto-size-columns"): void;
  (e: "reset-filters"): void;
  (e: "export-csv"): void;
  (e: "reset-state"): void;
  (e: "set-column-visibility", colId: string, visible: boolean): void;
}>();

const { t } = useI18n();
</script>
