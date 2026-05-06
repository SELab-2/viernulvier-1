<template>
  <div v-if="show && panel" class="cms-side-overlay" @click.self="$emit('close')">
    <aside class="cms-side-panel">
      <div class="cms-side-header">
        <h2 class="text-lg font-semibold text-ink-primary">
          {{ panel.label }}
        </h2>
        <button
          type="button"
          class="cms-side-close"
          @click="$emit('close')"
        >
          {{ t("cms.panel.close") }}
        </button>
      </div>

      <div class="cms-side-body">
        <p v-if="bulkCount > 1" class="text-xs text-ink-secondary">
          {{ t("cms.panel.bulkNotice", { count: bulkCount }) }}
        </p>

        <div
          v-for="group in additionalTagGroups"
          :key="group.tagTypeId"
          class="cms-side-field rounded-md border border-surface-3 bg-surface-0 p-3"
        >
          <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
            {{ group.label }}
          </h3>
          <label
            v-for="tag in group.tags"
            :key="tag.id"
            class="flex items-center gap-2 py-1 text-sm text-ink-primary"
          >
            <input
              :checked="panel.selectedTagIds.includes(tag.id)"
              type="checkbox"
              @change="onTagCheckboxChange(tag.id, $event)"
            >
            <span>{{ tag.label }}</span>
          </label>
        </div>

        <p v-if="saveError" class="text-sm text-red-700">
          {{ saveError }}
        </p>
      </div>

      <div class="cms-side-footer">
        <p class="cms-side-save-hint">
          {{ t("cms.panel.saveHint") }}
        </p>
        <button
          type="button"
          class="cms-side-save"
          :disabled="isSaving"
          @click="$emit('save')"
        >
          {{ isSaving ? t("general.saving") : t("cms.panel.saveAction") }}
        </button>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { CmsTagGroup } from "@/services/cms";

/**
 * Side drawer for editing additional (non-primary) tags on one or more productions.
 */
defineProps<{
  show: boolean;
  panel: { rowId: number; label: string; selectedTagIds: number[] } | null;
  additionalTagGroups: ReadonlyArray<CmsTagGroup>;
  bulkCount: number;
  saveError: string | null;
  isSaving: boolean;
}>();

/**
 * Emitted interactions:
 * - `close`: close the drawer
 * - `save`: persist current selection
 * - `toggle-tag`: toggle one additional tag checkbox
 */
const emit = defineEmits<{
  close: [];
  save: [];
  "toggle-tag": [tagId: number, selected: boolean];
}>();

const { t } = useI18n();

/**
 * Adapts checkbox DOM events to the strongly typed `toggle-tag` payload.
 */
function onTagCheckboxChange(tagId: number, event: Event): void {
  const target = event.target as HTMLInputElement | null;
  emit("toggle-tag", tagId, Boolean(target?.checked));
}
</script>
