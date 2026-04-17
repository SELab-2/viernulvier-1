<template>
  <div class="cms-toolbar">
    <input
      :value="quickFilterText"
      type="text"
      class="cms-search-input"
      :placeholder="t('cms.actions.searchPlaceholder')"
      @input="onQuickFilterInput"
    />

    <div class="flex items-center gap-2">
      <span class="cms-selected-chip">
        {{ t("cms.actions.selectedCount", { count: selectedCount }) }}
      </span>
    </div>
  </div>

  <div class="cms-grid-actions">
    <button type="button" class="cms-mini-btn" @click="$emit('fit-columns')">{{ t("cms.actions.fitColumns") }}</button>
    <button type="button" class="cms-mini-btn" @click="$emit('auto-size-columns')">{{ t("cms.actions.autoSize") }}</button>
    <button type="button" class="cms-mini-btn" @click="$emit('reset-filters')">{{ t("cms.actions.resetFilters") }}</button>
    <button type="button" class="cms-mini-btn" @click="$emit('export-csv')">{{ t("cms.actions.exportCsv") }}</button>
    <button type="button" class="cms-mini-btn" @click="$emit('reset-state')">{{ t("cms.actions.resetState") }}</button>
    <button type="button" class="cms-mini-btn" @click="$emit('toggle-columns')">
      {{ columnChooserOpen ? t("cms.actions.hideColumns") : t("cms.actions.columns") }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const props = defineProps<{
  quickFilterText: string;
  selectedCount: number;
  columnChooserOpen: boolean;
}>();

const emit = defineEmits<{
  "update:quickFilterText": [value: string];
  "apply-quick-filter": [];
  "fit-columns": [];
  "auto-size-columns": [];
  "reset-filters": [];
  "export-csv": [];
  "reset-state": [];
  "toggle-columns": [];
}>();

const { t } = useI18n();

function onQuickFilterInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  emit("update:quickFilterText", target.value);
  emit("apply-quick-filter");
}
</script>

<style scoped>
@reference "@/style.css";

.cms-toolbar {
  @apply flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between;
}

.cms-grid-actions {
  @apply flex flex-wrap items-center gap-2;
}

.cms-search-input {
  @apply w-full rounded-md border border-surface-3 bg-surface-0 px-4 py-2 text-sm text-ink-primary placeholder:text-ink-tertiary sm:max-w-md;
}

.cms-selected-chip {
  @apply inline-flex w-fit items-center rounded-full border border-surface-3 bg-surface-0 px-3 py-1 text-xs font-semibold text-ink-secondary;
}

.cms-mini-btn {
  @apply rounded-md border border-surface-3 bg-surface-0 px-3 py-1 text-xs font-semibold text-ink-secondary transition hover:bg-surface-1;
}
</style>
