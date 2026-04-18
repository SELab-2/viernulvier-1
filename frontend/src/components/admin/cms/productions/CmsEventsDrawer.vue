<template>
  <aside v-if="show && selectedProduction" class="cms-events-drawer">
    <div class="cms-events-panel-header">
      <div>
        <h3 class="text-base font-semibold text-ink-primary">Events</h3>
        <p class="text-sm text-ink-secondary">
          {{ selectedProduction.title || selectedProduction.performer }}
        </p>
      </div>
      <button type="button" class="cms-side-close" @click="$emit('close')">
        {{ t("cms.panel.close") }}
      </button>
    </div>

    <div class="cms-events-actions">
      <div class="flex justify-end">
        <button type="button" class="cms-side-save" :disabled="eventsPanelLoading" @click="$emit('open-create-event')">
          + Add Event
        </button>
      </div>
    </div>

    <p v-if="eventsPanelLoading" class="text-sm text-ink-secondary">
      {{ t("cms.panel.saving") }}
    </p>
    <p v-else-if="eventsPanelError" class="text-sm text-red-700">
      {{ eventsPanelError }}
    </p>
    <p v-else-if="selectedEventRows.length === 0" class="text-sm text-ink-secondary">
      {{ t("cms.actions.noRows") }}
    </p>
    <div v-else class="overflow-x-auto">
      <table class="cms-events-table">
        <thead>
          <tr>
            <th>{{ t("cms.events.date") }}</th>
            <th>{{ t("cms.events.time") }}</th>
            <th>{{ t("cms.events.location") }}</th>
            <th>{{ t("cms.events.price") }}</th>
            <th>Info (NL)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="eventRow in selectedEventRows"
            :key="eventRow.id"
            @focusout="$emit('event-row-focus-out', eventRow, $event)"
            @keydown.enter.prevent="$emit('event-row-enter', eventRow)"
          >
            <td>
              <input v-model="eventRow.startsAt" type="datetime-local" class="cms-text-input" />
            </td>
            <td>
              <input v-model="eventRow.endsAt" type="datetime-local" class="cms-text-input" />
            </td>
            <td>
              <select v-model.number="eventRow.hallId" class="cms-text-input">
                <option v-for="hall in hallsData" :key="`event-${eventRow.id}-hall-${hall.id}`" :value="hall.id">
                  {{ localizeValue(hall.name) || `Hall #${hall.id}` }}
                </option>
              </select>
            </td>
            <td>{{ eventRow.price }}</td>
            <td>
              <input v-model="eventRow.infoNl" type="text" class="cms-text-input" />
            </td>
            <td>
              <div class="cms-events-inline-action">
                <button
                  type="button"
                  class="cms-side-save"
                  :disabled="eventsPanelLoading"
                  @click="$emit('save-linked-event', eventRow)"
                >
                  Save
                </button>
                <button
                  type="button"
                  class="cms-side-close"
                  :disabled="eventsPanelLoading"
                  @click="$emit('remove-linked-event', eventRow)"
                >
                  Remove
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { Hall } from "@viernulvier/shared";
import { useI18n } from "vue-i18n";
import type { LanguageMap } from "@/utils/i18n";
import type { CmsEventGridRow, CmsProductionGridRow } from "@/services/cms";

defineProps<{
  show: boolean;
  selectedProduction: CmsProductionGridRow | null;
  selectedEventRows: CmsEventGridRow[];
  hallsData: Hall[];
  eventsPanelLoading: boolean;
  eventsPanelError: string | null;
  localizeValue: (map: LanguageMap | null | undefined) => string;
}>();

defineEmits<{
  close: [];
  "open-create-event": [];
  "save-linked-event": [eventRow: CmsEventGridRow];
  "remove-linked-event": [eventRow: CmsEventGridRow];
  "event-row-focus-out": [eventRow: CmsEventGridRow, focusEvent: FocusEvent];
  "event-row-enter": [eventRow: CmsEventGridRow];
}>();

const { t } = useI18n();
</script>

<style scoped>
@reference "@/style.css";

.cms-events-drawer {
  @apply fixed right-0 top-0 z-50 flex h-screen w-full max-w-3xl flex-col gap-4 overflow-y-auto border-l border-surface-3 bg-surface-0 p-5 shadow-2xl;
}

.cms-events-panel-header {
  @apply mb-3 flex items-start justify-between gap-3;
}

.cms-events-table {
  @apply min-w-full border-collapse text-sm;
}

.cms-events-actions {
  @apply flex flex-col gap-4;
}

.cms-events-inline-action {
  @apply flex items-center gap-2;
}

.cms-events-table th {
  @apply border-b border-surface-3 px-3 py-2 text-left font-semibold text-ink-primary;
}

.cms-events-table td {
  @apply border-b border-surface-3 px-3 py-2 text-ink-secondary;
}

.cms-side-close {
  @apply rounded-md border border-surface-3 px-3 py-1.5 text-sm text-ink-secondary transition hover:bg-surface-1;
}

.cms-side-save {
  @apply rounded-md bg-surface-inv px-4 py-2 text-sm font-semibold text-ink-on-inv transition hover:bg-surface-inv-raised disabled:cursor-not-allowed disabled:opacity-60;
}

.cms-text-input {
  @apply rounded-md border border-surface-3 bg-surface-0 px-3 py-2 text-sm text-ink-primary;
}
</style>
