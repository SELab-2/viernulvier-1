<template>
  <div v-if="open" class="cms-modal-overlay" data-testid="cms-create-tag-type-modal" @click.self="emit('close')">
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
              :class="{ active: extraLangs.en }"
              @click="toggleExtraLang('en')"
            >
              EN
            </button>
            <button
              type="button"
              class="cms-language-pill"
              :class="{ active: extraLangs.fr }"
              @click="toggleExtraLang('fr')"
            >
              FR
            </button>
          </div>
        </div>

        <fieldset class="cms-form-block">
          <legend class="cms-form-legend">
            {{ t("cms.columns.tagType") }}
            <span class="cms-required">*</span>
          </legend>

          <div :class="langGridClass">
            <label v-for="lang in visibleLangs" :key="`name-${lang}`" class="cms-form-lang-field">
              <span class="cms-lang-label">{{ lang.toUpperCase() }}</span>
              <input
                v-model="name[lang]"
                type="text"
                class="cms-text-input"
                :data-testid="`cms-create-tag-type-name-${lang}`"
              />
            </label>
          </div>
        </fieldset>

        <p v-if="error" class="text-sm text-red-700" data-testid="cms-create-tag-type-error">
          {{ error }}
        </p>
      </div>

      <footer class="cms-modal-footer">
        <button type="button" class="cms-side-close" @click="emit('close')">
          {{ t("general.cancel") }}
        </button>
        <button
          type="button"
          class="cms-side-save"
          data-testid="cms-create-tag-type-submit"
          :disabled="isCreating"
          @click="submit"
        >
          {{ isCreating ? t("general.saving") : t("cms.create.submitTagType") }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { SupportedLang } from "@/i18n";
import { emptyLangRecord } from "@/services/cms/helpers";
import { toLanguageMap } from "@/services/cms";
import type { LanguageMap } from "@/utils/language-utils";

const props = defineProps<{
  open: boolean;
  /** Pre-fill the active language input when opening (e.g. text typed into the picker). */
  initialName?: string;
  /** Which language `initialName` belongs to. Defaults to "nl". */
  initialLang?: SupportedLang;
  isCreating: boolean;
  error: string | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "submit", payload: { name: LanguageMap }): void;
}>();

const { t } = useI18n();

const name = reactive<Record<SupportedLang, string>>(emptyLangRecord());
const extraLangs = ref({ en: false, fr: false });

const visibleLangs = computed<SupportedLang[]>(() => {
  const result: SupportedLang[] = ["nl"];
  if (extraLangs.value.en) result.push("en");
  if (extraLangs.value.fr) result.push("fr");
  return result;
});

const langGridClass = computed(() => {
  const count = visibleLangs.value.length;
  if (count <= 1) return "cms-lang-grid cms-lang-grid-single";
  if (count === 2) return "cms-lang-grid cms-lang-grid-double";
  return "cms-lang-grid";
});

function toggleExtraLang(lang: "en" | "fr"): void {
  extraLangs.value = { ...extraLangs.value, [lang]: !extraLangs.value[lang] };
}

function resetForm(): void {
  const fresh = emptyLangRecord();
  for (const key of Object.keys(name) as SupportedLang[]) {
    name[key] = fresh[key];
  }
  extraLangs.value = { en: false, fr: false };
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      resetForm();
      const lang = props.initialLang ?? "nl";
      if (props.initialName !== undefined) {
        name[lang] = props.initialName;
      }
    }
  },
  { immediate: true },
);

function submit(): void {
  emit("submit", { name: toLanguageMap(name) });
}
</script>

<style scoped>
@reference "@/style.css";

.cms-modal-overlay {
  @apply fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4;
}

.cms-modal {
  @apply flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-surface-3 bg-surface-0;
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
