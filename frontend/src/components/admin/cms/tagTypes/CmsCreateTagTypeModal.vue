<template>
  <div v-if="open" class="cms-modal-overlay" @click.self="emit('close')">
    <section class="cms-modal" role="dialog" aria-modal="true">
      <header class="cms-modal-header">
        <h2 class="text-xl font-bold text-ink-primary">{{ t("cms.create.tagTypeTitle") }}</h2>
        <button type="button" class="cms-side-close" @click="emit('close')">
          {{ t("cms.panel.close") }}
        </button>
      </header>

      <div class="cms-modal-body">
        <div class="cms-language-toggle-row">
          <span class="text-sm font-semibold text-ink-primary">{{ t("cms.create.languages") }}</span>
          <div class="flex items-center gap-2">
            <span class="cms-language-pill active">NL</span>
            <button
              type="button"
              class="cms-language-pill"
              :class="{ active: createExtraLangs.en }"
              @click="emit('update-extra-lang', 'en', !createExtraLangs.en)"
            >
              EN
            </button>
            <button
              type="button"
              class="cms-language-pill"
              :class="{ active: createExtraLangs.fr }"
              @click="emit('update-extra-lang', 'fr', !createExtraLangs.fr)"
            >
              FR
            </button>
          </div>
        </div>

        <fieldset class="cms-form-block">
          <legend class="cms-form-legend">
            {{ t("cms.columns.tagTypeName") }}
            <span class="cms-required">*</span>
          </legend>

          <div :class="langGridClass">
            <label v-for="lang in visibleCreateLangs" :key="`name-${lang}`" class="cms-form-lang-field">
              <span class="cms-lang-label">{{ lang.toUpperCase() }}</span>
              <input
                :value="createForm.name[lang]"
                type="text"
                class="cms-text-input"
                :data-testid="`cms-create-tag-type-name-${lang}`"
                @input="emit('update-name', lang, ($event.target as HTMLInputElement).value)"
              />
            </label>
          </div>
        </fieldset>

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
          data-testid="cms-create-tag-type-submit"
          @click="emit('submit')"
        >
          {{ isCreating ? t("general.saving") : t("cms.create.submitTagType") }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { CreateTagTypeFormState } from "@/services/cms";
import type { SupportedLang } from "@/i18n";

defineProps<{
  open: boolean;
  createForm: CreateTagTypeFormState;
  createExtraLangs: { en: boolean; fr: boolean };
  visibleCreateLangs: SupportedLang[];
  langGridClass: string;
  createError: string | null;
  isCreating: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "submit"): void;
  (e: "update-name", lang: SupportedLang, value: string): void;
  (e: "update-extra-lang", lang: "en" | "fr", value: boolean): void;
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

.cms-lang-grid {
  @apply mt-3 grid grid-cols-1 gap-3 md:grid-cols-3;
}

.cms-lang-grid-single {
  @apply grid-cols-1 md:grid-cols-1;
}

.cms-lang-grid-double {
  @apply grid-cols-1 md:grid-cols-2;
}

.cms-form-lang-field {
  @apply flex flex-col gap-2;
}

.cms-language-toggle-row {
  @apply flex flex-wrap items-center justify-between gap-3 rounded-md border border-surface-3 bg-surface-0 px-3 py-2;
}

.cms-language-pill {
  @apply rounded-full border border-surface-3 px-3 py-1 text-xs font-semibold text-ink-secondary transition hover:bg-surface-1;
}

.cms-language-pill.active {
  @apply border-transparent bg-surface-inv text-ink-on-inv;
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
