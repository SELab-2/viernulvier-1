<template>
  <div v-if="panel" class="cms-side-overlay" @click.self="emit('close')">
    <aside class="cms-side-panel">
      <div class="cms-side-header">
        <h2 class="text-lg font-semibold text-ink-primary">
          {{ panel.label }}
        </h2>
        <button
          type="button"
          class="cms-side-close"
          @click="emit('close')"
        >
          {{ t("cms.panel.close") }}
        </button>
      </div>

      <div class="cms-side-body">
        <p v-if="bulkCount > 1" class="text-xs text-ink-secondary">
          {{ t("cms.panel.bulkNotice", { count: bulkCount }) }}
        </p>

        <label
          v-for="lang in languages"
          :key="lang"
          class="cms-side-field"
        >
          <span class="text-xs font-semibold uppercase tracking-wide text-ink-secondary">
            {{ lang.toUpperCase() }}
          </span>

          <MarkdownEditor
            v-model="localValues[lang]"
          />
        </label>

        <p v-if="saveError" class="text-sm text-red-700">
          {{ saveError }}
        </p>
      </div>

      <div class="cms-side-footer">
        <button
          type="button"
          class="cms-side-save"
          :disabled="isSaving"
          @click="emit('save')"
        >
          {{ isSaving ? t("general.saving") : t("cms.panel.save") }}
        </button>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { SUPPORTED_LANGS, type SupportedLang } from "@/i18n";
import type { EditorPanelState } from "@/services/cms";
import MarkdownEditor from "@/components/MarkdownEditor.vue";

const props = defineProps<{
  panel: EditorPanelState | null;
  bulkCount: number;
  saveError: string | null;
  isSaving: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [];
  "update:panel": [value: EditorPanelState | null];
}>();

const { t } = useI18n();
const languages = SUPPORTED_LANGS as ReadonlyArray<SupportedLang>;

type LocalValues = Record<SupportedLang, string>;

const localValues = ref<LocalValues>({ ...props.panel?.values } as LocalValues);

watch(
  () => props.panel && `${props.panel.rowId}:${props.panel.apiField}`,
  () => {
    localValues.value = { ...props.panel?.values } as LocalValues;
  },
);

watch(
  localValues,
  (values) => {
    if (!props.panel) return;

    const current = props.panel.values;

    const changed = (Object.keys(values) as (keyof LocalValues)[]).some(
      (lang) => values[lang] !== current[lang],
    );

    if (!changed) return;

    emit("update:panel", {
      ...props.panel,
      values: { ...values },
    });
  },
  { deep: true },
);
</script>