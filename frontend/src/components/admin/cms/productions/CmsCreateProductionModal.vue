<template>
  <div v-if="open" class="cms-modal-overlay" @click.self="$emit('close')">
    <section class="cms-modal" role="dialog" aria-modal="true">
      <header class="cms-modal-header">
        <h2 class="text-xl font-bold text-ink-primary">{{ t("cms.create.title") }}</h2>
        <button type="button" class="cms-side-close" @click="$emit('close')">
          {{ t("cms.panel.close") }}
        </button>
      </header>

      <div class="cms-modal-body">
        <label class="cms-toggle-row">
          <input :checked="createForm.finalized" type="checkbox" @change="onFinalizedChange" />
          <span>{{ t("cms.create.finalized") }}</span>
        </label>

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

        <fieldset v-for="field in createFields" :key="field.key" class="cms-form-block">
          <legend class="cms-form-legend">
            {{ t(field.labelKey) }}
            <span v-if="field.required" class="cms-required">*</span>
          </legend>

          <div :class="langGridClass">
            <label v-for="lang in visibleCreateLangs" :key="`${field.key}-${lang}`" class="cms-form-lang-field">
              <span class="cms-lang-label">{{ lang.toUpperCase() }}</span>
              <textarea
                v-if="field.multiline"
                :value="createForm[field.key][lang]"
                class="cms-side-textarea"
                rows="3"
                @input="emit('update-form-field', field.key, lang, ($event.target as HTMLTextAreaElement).value)"
              />
              <input
                v-else
                :value="createForm[field.key][lang]"
                type="text"
                class="cms-text-input"
                @input="emit('update-form-field', field.key, lang, ($event.target as HTMLInputElement).value)"
              />
            </label>
          </div>
        </fieldset>

        <fieldset class="cms-form-block">
          <legend class="cms-form-legend">{{ t("cms.create.tags.title") }}</legend>

          <div class="cms-tag-selector-grid">
            <label class="cms-form-lang-field">
              <span class="cms-lang-label">{{ t("cms.create.tags.primary") }}</span>
              <select
                class="cms-text-input cms-select-input"
                :disabled="primaryTagOptions.length === 0"
                :value="selectedPrimaryTagId ?? ''"
                @change="onPrimaryTagChange"
              >
                <option v-if="primaryTagOptions.length === 0" value="">
                  {{ t("cms.create.tags.primaryEmpty") }}
                </option>
                <option v-for="tag in primaryTagOptions" :key="tag.id" :value="tag.id">
                  {{ tag.label }}
                </option>
              </select>
            </label>

            <p class="text-xs text-ink-tertiary">
              {{ t("cms.create.tags.hint") }}
            </p>
          </div>

          <details v-for="group in additionalTagGroups" :key="group.tagTypeId" class="cms-tag-group">
            <summary class="cms-tag-group-summary">
              <span>{{ group.label }}</span>
              <span class="cms-tag-count">{{ group.tags.length }}</span>
            </summary>

            <div class="cms-tag-checkbox-list">
              <label v-for="tag in group.tags" :key="tag.id" class="cms-tag-checkbox-row">
                <input
                  :checked="selectedTagIds.includes(tag.id)"
                  type="checkbox"
                  @change="onTagToggle(tag.id, ($event.target as HTMLInputElement).checked)"
                />
                <span>{{ tag.label }}</span>
              </label>
            </div>
          </details>
        </fieldset>

        <fieldset class="cms-form-block">
          <legend class="cms-form-legend">{{ t("cms.create.media.title") }}</legend>

          <div class="cms-upload-controls">
            <label class="cms-form-lang-field">
              <span class="cms-lang-label">{{ t("cms.create.media.uploadImage") }}</span>
              <input type="file" accept="image/*" class="cms-text-input" @change="emit('image-file-change', $event)" />
            </label>
          </div>

          <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label class="cms-form-lang-field">
              <span class="cms-lang-label">{{ t("cms.create.fields.imagePrimary") }}</span>
              <input
                :value="createForm.video_1.nl"
                type="text"
                class="cms-text-input"
                placeholder="https://example.com/image.jpg"
                @input="emit('update-form-field', 'video_1', 'nl', ($event.target as HTMLInputElement).value)"
              />
            </label>

            <label class="cms-form-lang-field">
              <span class="cms-lang-label">{{ t("cms.create.fields.imageSecondary") }}</span>
              <input
                :value="createForm.video_2.nl"
                type="text"
                class="cms-text-input"
                placeholder="https://example.com/image.jpg"
                @input="emit('update-form-field', 'video_2', 'nl', ($event.target as HTMLInputElement).value)"
              />
            </label>

            <label class="cms-form-lang-field md:col-span-2">
              <span class="cms-lang-label">{{ t("cms.create.media.youtubeLink") }}</span>
              <input
                :value="createForm.video_1.nl"
                type="text"
                class="cms-text-input"
                placeholder="https://www.youtube.com/watch?v=..."
                @input="emit('update-form-field', 'video_1', 'nl', ($event.target as HTMLInputElement).value)"
              />
            </label>
          </div>

          <p class="mt-2 text-xs text-ink-tertiary">
            {{ t("cms.create.media.hint") }}
          </p>
        </fieldset>

        <p v-if="createError" class="text-sm text-red-700">
          {{ createError }}
        </p>
      </div>

      <footer class="cms-modal-footer">
        <button type="button" class="cms-side-close" @click="$emit('close')">
          {{ t("general.cancel") }}
        </button>
        <button type="button" class="cms-side-save" :disabled="isCreating" @click="$emit('submit')">
          {{ isCreating ? t("general.saving") : t("cms.create.submit") }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { SupportedLang } from "@/i18n";
import type { CmsCreateFieldConfig, CmsTagGroup, CreateFieldKey, CreateFormState } from "@/services/cms";

/**
 * Modal for creating productions, including language fields, media inputs, and tag assignment.
 */
const props = defineProps<{
  open: boolean;
  createForm: CreateFormState;
  createExtraLangs: { en: boolean; fr: boolean };
  visibleCreateLangs: ReadonlyArray<SupportedLang>;
  langGridClass: string;
  createFields: Array<CmsCreateFieldConfig>;
  tagGroups: ReadonlyArray<CmsTagGroup>;
  selectedPrimaryTagId: number | null;
  selectedTagIds: ReadonlyArray<number>;
  createError: string | null;
  isCreating: boolean;
}>();

const emit = defineEmits<{
  close: [];
  submit: [];
  "update-finalized": [value: boolean];
  "update-extra-lang": [lang: "en" | "fr", value: boolean];
  "update-form-field": [field: CreateFieldKey, lang: SupportedLang, value: string];
  "update-primary-tag": [value: number | null];
  "toggle-tag": [tagId: number, selected: boolean];
  "image-file-change": [event: Event];
  "video-file-change": [event: Event];
}>();

const { t } = useI18n();

/** Genre tags shown as primary-tag selector options. */
const primaryTagOptions = computed(() => props.tagGroups.find((group) => group.isGenre)?.tags ?? []);
/** Non-genre tag groups shown as checkbox lists. */
const additionalTagGroups = computed(() => props.tagGroups.filter((group) => !group.isGenre));

/** Emits finalized toggle from checkbox state. */
function onFinalizedChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  emit("update-finalized", target.checked);
}

/** Parses primary-tag selection and emits nullable numeric ID. */
function onPrimaryTagChange(event: Event): void {
  const target = event.target as HTMLSelectElement;
  const value = target.value.trim();
  emit("update-primary-tag", value.length > 0 ? Number(value) : null);
}

/** Emits additional-tag checkbox toggles. */
function onTagToggle(tagId: number, selected: boolean): void {
  emit("toggle-tag", tagId, selected);
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
  @apply border-transparent bg-accent-dark text-surface-0;
}

.cms-upload-controls {
  @apply grid grid-cols-1 gap-3 md:grid-cols-3;
}

.cms-tag-selector-grid {
  @apply mt-3 grid grid-cols-1 gap-3 md:grid-cols-2;
}

.cms-select-input {
  @apply appearance-none;
}

.cms-tag-group {
  @apply mt-3 rounded-md border border-surface-3 bg-surface-0 px-3 py-2;
}

.cms-tag-group-summary {
  @apply flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink-primary;
}

.cms-tag-count {
  @apply rounded-full bg-surface-1 px-2 py-0.5 text-xs font-semibold text-ink-secondary;
}

.cms-tag-checkbox-list {
  @apply mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2;
}

.cms-tag-checkbox-row {
  @apply flex items-center gap-2 rounded-md border border-surface-3 bg-surface-1 px-3 py-2 text-sm text-ink-primary;
}

.cms-lang-label {
  @apply text-xs font-semibold uppercase tracking-wide text-ink-secondary;
}

.cms-text-input {
  @apply rounded-md border border-surface-3 bg-surface-0 px-3 py-2 text-sm text-ink-primary;
}

.cms-toggle-row {
  @apply flex items-center gap-2 text-sm text-ink-primary;
}

.cms-side-close {
  @apply rounded-md border border-surface-3 px-3 py-1.5 text-sm text-ink-secondary transition hover:bg-surface-1;
}

.cms-side-save {
  @apply rounded-md bg-accent-dark px-4 py-2 text-sm font-semibold text-surface-0 transition hover:bg-accent-dark-hover disabled:cursor-not-allowed disabled:opacity-60;
}
</style>