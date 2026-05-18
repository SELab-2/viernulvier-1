<template>
  <div v-if="open" class="cms-modal-overlay" @click.self="emit('close')">
    <section class="cms-create-modal" role="dialog" aria-modal="true" data-testid="create-blogpost-modal">
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

          <div class="flex flex-col gap-4">
            <label v-for="lang in visibleCreateLangs" :key="`content-${lang}`" class="cms-form-lang-field">
              <span class="cms-lang-label">{{ lang.toUpperCase() }}</span>
              <MarkdownEditor
                :model-value="createForm.content[lang]"
                :data-testid="`cms-create-blogpost-content-${lang}`"
                @update:model-value="(value) => emit('update-content', lang, value)"
              />
            </label>
          </div>
        </fieldset>

        <fieldset class="cms-form-block">
          <legend class="cms-form-legend">
            {{ t("cms.columns.blogpost.productions") }}
          </legend>

          <div class="cms-list-create">
            <form
              class="cms-list-entry"
              @submit.prevent="addProduction"
            >
              <input
                ref="productionInput"
                v-model="productionDraft"
                type="text"
                inputmode="numeric"
                class="cms-text-input"
                data-testid="cms-create-blogpost-production-input"
              />

              <button
                type="submit"
                class="cms-list-add"
              >
                +
              </button>
            </form>

            <div
              v-if="createForm.productions.length > 0"
              class="cms-list-flairs"
            >
              <span
                v-for="id in createForm.productions"
                :key="id"
                class="cms-list-flair"
              >
                {{ id }}

                <button
                  type="button"
                  class="cms-list-flair-remove"
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
          class="cms-form-submit"
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
import MarkdownEditor from "@/components/MarkdownEditor.vue";

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
