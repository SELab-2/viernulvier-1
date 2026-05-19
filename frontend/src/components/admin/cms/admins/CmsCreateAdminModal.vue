<template>
  <div v-if="open" class="cms-modal-overlay" @click.self="emit('close')">
    <section class="cms-create-modal" role="dialog" aria-modal="true">
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
            class="cms-text-input mt-3 w-full"
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
            class="cms-text-input mt-3 w-full"
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
          class="cms-form-submit"
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
