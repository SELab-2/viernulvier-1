<template>
  <div
    v-if="open && selectedProduction"
    class="cms-modal-overlay"
    @click.self="$emit('close')"
  >
    <section class="cms-modal !h-auto !max-w-3xl" role="dialog" aria-modal="true">
      <header class="cms-modal-header">
        <h2 class="text-xl font-bold text-ink-primary">Add Event</h2>
        <button type="button" class="cms-side-close" @click="$emit('close')">
          {{ t("cms.panel.close") }}
        </button>
      </header>

      <div class="cms-modal-body">
        <p class="text-sm text-ink-secondary">
          {{ selectedProduction.title || selectedProduction.performer }}
        </p>

        <div class="cms-events-create-grid">
          <label class="cms-form-lang-field">
            <span class="cms-lang-label">Start</span>
            <input
              :value="createLinkedEventForm.startsAt"
              type="datetime-local"
              class="cms-text-input"
              @input="onTextInput('startsAt', $event)"
            />
          </label>
          <label class="cms-form-lang-field">
            <span class="cms-lang-label">End</span>
            <input
              :value="createLinkedEventForm.endsAt"
              type="datetime-local"
              class="cms-text-input"
              @input="onTextInput('endsAt', $event)"
            />
          </label>
          <label class="cms-form-lang-field">
            <span class="cms-lang-label">Doors</span>
            <input
              :value="createLinkedEventForm.doorsAt"
              type="datetime-local"
              class="cms-text-input"
              @input="onTextInput('doorsAt', $event)"
            />
          </label>
          <label class="cms-form-lang-field">
            <span class="cms-lang-label">Hall</span>
            <select
              v-model.number="selectedHallId"
              class="cms-text-input"
            >
              <option v-for="hall in hallsData" :key="`create-event-hall-${hall.id}`" :value="hall.id">
                {{ localizeValue(hall.name) || `Hall #${hall.id}` }}
              </option>
            </select>
          </label>
          <label class="cms-form-lang-field cms-events-create-info">
            <span class="cms-lang-label">Info (NL)</span>
            <input
              :value="createLinkedEventForm.infoNl"
              type="text"
              class="cms-text-input"
              @input="onTextInput('infoNl', $event)"
            />
          </label>
        </div>

        <p v-if="eventsPanelError" class="text-sm text-red-700">
          {{ eventsPanelError }}
        </p>
      </div>

      <footer class="cms-modal-footer">
        <button type="button" class="cms-side-close" @click="$emit('close')">
          {{ t("cms.create.cancel") }}
        </button>
        <button type="button" class="cms-side-save" :disabled="eventsPanelLoading" @click="$emit('submit')">
          {{ eventsPanelLoading ? t("cms.panel.saving") : "Create event" }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Hall } from "@viernulvier/shared";
import { computed, watchEffect } from "vue";
import { useI18n } from "vue-i18n";
import type { LanguageMap } from "@/utils/i18n";
import type { CmsCreateLinkedEventForm, CmsProductionGridRow } from "@/services/cms";

/**
 * Modal used to create and link a new event to the currently selected production.
 */
const props = defineProps<{
  open: boolean;
  selectedProduction: CmsProductionGridRow | null;
  createLinkedEventForm: CmsCreateLinkedEventForm;
  hallsData: Hall[];
  eventsPanelLoading: boolean;
  eventsPanelError: string | null;
  localizeValue: (map: LanguageMap | null | undefined) => string;
}>();

const { t } = useI18n();

const emit = defineEmits<{
  close: [];
  submit: [];
  "update-form-field": [
    field: keyof CmsCreateLinkedEventForm,
    value: CmsCreateLinkedEventForm[keyof CmsCreateLinkedEventForm],
  ];
}>();

const selectedHallId = computed({
  get: () => props.createLinkedEventForm.hallId,
  set: (value: number) => {
    emit("update-form-field", "hallId", Number(value));
  },
});

watchEffect(() => {
  if (props.hallsData.length === 0) {
    return;
  }

  const hasSelectedHall = props.hallsData.some((hall) => hall.id === props.createLinkedEventForm.hallId);
  if (!hasSelectedHall) {
    emit("update-form-field", "hallId", props.hallsData[0].id);
  }
});

/** Emits text/date input updates to the parent form state. */
function onTextInput(field: "startsAt" | "endsAt" | "doorsAt" | "infoNl", event: Event): void {
  const target = event.target as HTMLInputElement;
  emit("update-form-field", field, target.value);
}

</script>

<style scoped>
@reference "@/style.css";

.cms-modal-overlay {
  @apply fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4;
}

.cms-modal {
  @apply flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-surface-3 bg-surface-0;
}

.cms-modal-header {
  @apply flex items-center justify-between border-b border-surface-3 px-5 py-4;
}

.cms-modal-body {
  @apply flex-1 space-y-5 overflow-y-auto px-5 py-4;
}

.cms-modal-footer {
  @apply flex justify-end gap-2 border-t border-surface-3 px-5 py-4;
}

.cms-events-create-grid {
  @apply mt-3 grid grid-cols-1 gap-3 md:grid-cols-2;
}

.cms-events-create-info {
  @apply md:col-span-2;
}

.cms-form-lang-field {
  @apply flex flex-col gap-2;
}

.cms-lang-label {
  @apply text-xs font-semibold uppercase tracking-wide text-ink-secondary;
}

.cms-text-input {
  @apply rounded-md border border-surface-3 bg-surface-0 px-3 py-2 text-sm text-ink-primary;
}

.cms-side-close {
  @apply rounded-md border border-surface-3 px-3 py-1.5 text-sm text-ink-secondary transition hover:bg-surface-1;
}

.cms-side-save {
  @apply rounded-md bg-surface-inv px-4 py-2 text-sm font-semibold text-ink-on-inv transition hover:bg-surface-inv-raised disabled:cursor-not-allowed disabled:opacity-60;
}
</style>
