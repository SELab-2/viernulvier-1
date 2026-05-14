<template>
  <div v-if="open" class="cms-modal-overlay" @click.self="emit('close')">
    <section class="cms-modal" role="dialog" aria-modal="true">
      <header class="cms-modal-header">
        <h2 class="text-xl font-bold text-ink-primary">{{ t("cms.create.admin.adminTitle") }}</h2>
        <button type="button" class="cms-side-close" @click="emit('close')">
          {{ t("cms.panel.close") }}
        </button>
      </header>

      <div class="cms-modal-body">
        <fieldset class="cms-form-block">
          <legend class="cms-form-legend">
            {{ t("cms.columns.admin.username") }}
            <span class="cms-required">*</span>
          </legend>
          <input
            :value="createForm.username"
            type="text"
            class="cms-text-input"
            autocomplete="off"
            data-testid="cms-create-admin-username"
            @input="emit('update-username', ($event.target as HTMLInputElement).value)"
          />
        </fieldset>

        <fieldset class="cms-form-block">
          <legend class="cms-form-legend">
            {{ t("cms.create.admin.adminPassword") }}
            <span class="cms-required">*</span>
          </legend>
          <p class="mb-3 text-xs text-ink-tertiary">
            {{ t("cms.create.admin.adminPasswordHint") }}
          </p>
          <input
            :value="createForm.password"
            type="password"
            class="cms-text-input"
            autocomplete="new-password"
            data-testid="cms-create-admin-password"
            @input="emit('update-password', ($event.target as HTMLInputElement).value)"
          />
        </fieldset>

        <label class="cms-toggle-row">
          <input
            :checked="createForm.super"
            type="checkbox"
            data-testid="cms-create-admin-super"
            @change="emit('update-super', ($event.target as HTMLInputElement).checked)"
          />
          <span>{{ t("cms.columns.admin.super") }}</span>
        </label>

        <p v-if="createError" class="text-sm text-red-700">
          {{ createError }}
        </p>
      </div>

      <footer class="cms-modal-footer">
        <button type="button" class="cms-side-close" @click="emit('close')">
          {{ t("general.cancel") }}
        </button>
        <button
          type="button"
          class="cms-side-save"
          :disabled="isCreating"
          data-testid="cms-create-admin-submit"
          @click="emit('submit')"
        >
          {{ isCreating ? t("general.saving") : t("cms.create.admin.submitAdmin") }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { CreateAdminFormState } from "@/services/cms";

defineProps<{
  open: boolean;
  createForm: CreateAdminFormState;
  createError: string | null;
  isCreating: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "submit"): void;
  (e: "update-username", value: string): void;
  (e: "update-password", value: string): void;
  (e: "update-super", value: boolean): void;
}>();

const { t } = useI18n();
</script>

<style scoped>
@reference "@/style.css";

.cms-modal-overlay {
  @apply fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4;
}

.cms-modal {
  @apply flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-surface-3 bg-surface-0;
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

.cms-form-block {
  @apply rounded-lg border border-surface-3 bg-surface-1 p-4;
}

.cms-form-legend {
  @apply px-1 text-sm font-semibold text-ink-primary;
}

.cms-required {
  @apply ml-1 text-red-600;
}

.cms-text-input {
  @apply mt-3 w-full rounded-md border border-surface-3 bg-surface-0 px-3 py-2 text-sm text-ink-primary;
}

.cms-toggle-row {
  @apply flex items-center gap-2 text-sm text-ink-primary;
}

.cms-side-close {
  @apply rounded-md border border-surface-3 px-3 py-1.5 text-sm text-ink-secondary transition hover:bg-surface-1;
}

.cms-side-save {
  @apply rounded-md bg-surface-inv px-4 py-2 text-sm font-semibold text-ink-on-inv transition hover:bg-surface-inv-raised disabled:cursor-not-allowed disabled:opacity-60;
}
</style>