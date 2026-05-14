<template>
  <div v-if="open" class="cms-modal-overlay" @click.self="emit('close')">
    <section class="cms-modal" role="dialog" aria-modal="true" data-testid="create-blogpost-modal">
      <header class="cms-modal-header">
        <h2 class="text-xl font-bold text-ink-primary">{{ t("cms.create.blogpost.title") }}</h2>
        <button type="button" class="cms-side-close" data-testid="modal-close" @click="emit('close')">
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
            {{ t("cms.columns.title") }}
            <span class="cms-required">*</span>
          </legend>

          <div :class="langGridClass">
            <label v-for="lang in visibleCreateLangs" :key="`title-${lang}`" class="cms-form-lang-field">
              <span class="cms-lang-label">{{ lang.toUpperCase() }}</span>
              <input
                :value="createForm.title[lang]"
                type="text"
                class="cms-text-input"
                :data-testid="`cms-create-blogpost-title-${lang}`"
                @input="emit('update-title', lang, ($event.target as HTMLInputElement).value)"
              />
            </label>
          </div>
        </fieldset>

        <fieldset class="cms-form-block">
          <legend class="cms-form-legend">
            {{ t("cms.columns.blogpost.content") }}
            <span class="cms-required">*</span>
          </legend>

          <div :class="langGridClass">
            <label v-for="lang in visibleCreateLangs" :key="`content-${lang}`" class="cms-form-lang-field">
              <span class="cms-lang-label">{{ lang.toUpperCase() }}</span>
              <textarea
                :value="createForm.content[lang]"
                class="cms-text-input cms-textarea"
                :data-testid="`cms-create-blogpost-content-${lang}`"
                rows="6"
                @input="emit('update-content', lang, ($event.target as HTMLTextAreaElement).value)"
              />
            </label>
          </div>
        </fieldset>

        <fieldset class="cms-form-block">
          <legend class="cms-form-legend">
            {{ t("cms.columns.blogpost.productions") }}
          </legend>

          <div class="cms-production-create">
            <form
              class="cms-production-entry"
              @submit.prevent="addProduction"
            >
              <input
                ref="productionInput"
                v-model="productionDraft"
                type="number"
                inputmode="numeric"
                class="cms-text-input"
                data-testid="cms-create-blogpost-production-input"
              />

              <button
                type="submit"
                class="cms-production-add"
              >
                +
              </button>
            </form>

            <div
              v-if="createForm.productions.length > 0"
              class="cms-production-tags"
            >
              <span
                v-for="id in createForm.productions"
                :key="id"
                class="cms-production-tag"
              >
                {{ id }}

                <button
                  type="button"
                  class="cms-production-tag-remove"
                  @click="emit('remove-production-id', id)"
                >
                  ×
                </button>
              </span>
            </div>
          </div>

          <p v-if="productionInputError" class="mt-2 text-xs text-red-600">
            {{ productionInputError }}
          </p>
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
          @click="emit('submit')"
        >
          {{ isCreating ? t("general.saving") : t("cms.create.blogpost.submit") }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import type { SupportedLang } from "@/i18n";
import type { CreateBlogPostFormState } from "@/services/cms";

const props = defineProps<{
  open: boolean;
  createForm: CreateBlogPostFormState;
  createExtraLangs: { en: boolean; fr: boolean };
  visibleCreateLangs: SupportedLang[];
  langGridClass: string;
  createError: string | null;
  isCreating: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "submit"): void;
  (e: "update-title", lang: SupportedLang, value: string): void;
  (e: "update-content", lang: SupportedLang, value: string): void;
  (e: "update-extra-lang", lang: "en" | "fr", value: boolean): void;
  (e: "add-production-id", id: number): void;
  (e: "remove-production-id", id: number): void;
}>();

const { t } = useI18n();

const productionDraft = ref("");
const productionInput = useTemplateRef<HTMLInputElement>("productionInput");
const productionInputError = ref<string | null>(null);

function addProduction(): void {
  const parsed = Number(productionDraft.value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    productionInputError.value = t(
      "cms.create.validation.invalidId",
    );
    return;
  }

  if (props.createForm.productions.includes(parsed)) {
    productionInputError.value = null;
    productionDraft.value = "";

    void nextTick(() => {
      productionInput.value?.focus();
    });

    return;
  }

  emit("add-production-id", parsed);

  productionInputError.value = null;
  productionDraft.value = "";

  void nextTick(() => {
    productionInput.value?.focus();
  });
}
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

.cms-textarea {
  @apply resize-none leading-relaxed;
}

.cms-production-tags {
  @apply flex flex-wrap items-center gap-2;
}

.cms-production-tag {
  @apply flex items-center gap-1 rounded-full border border-surface-3 bg-surface-0 px-2.5 py-1 text-xs font-semibold text-ink-primary;
}

.cms-production-tag-remove {
  @apply -mr-0.5 flex h-4 w-4 items-center justify-center rounded-full text-ink-secondary transition hover:bg-surface-2 hover:text-ink-primary;
}

.cms-production-input {
  @apply min-w-[6rem] flex-1 rounded-md border border-surface-3 bg-surface-0 px-2 py-1 text-sm text-ink-primary placeholder:text-ink-tertiary;
  /* Hide browser number spinners */
  appearance: textfield;
}

.cms-production-create {
  @apply mt-3 space-y-3;
}

.cms-production-entry {
  @apply flex gap-2;
}

.cms-production-add {
  @apply rounded-md bg-surface-inv px-4 py-2 text-sm font-semibold text-ink-on-inv transition hover:bg-surface-inv-raised;
}

.cms-production-input::-webkit-inner-spin-button,
.cms-production-input::-webkit-outer-spin-button {
  appearance: none;
}

.cms-side-close {
  @apply rounded-md border border-surface-3 px-3 py-1.5 text-sm text-ink-secondary transition hover:bg-surface-1;
}

.cms-side-save {
  @apply rounded-md bg-surface-inv px-4 py-2 text-sm font-semibold text-ink-on-inv transition hover:bg-surface-inv-raised disabled:cursor-not-allowed disabled:opacity-60;
}
</style>