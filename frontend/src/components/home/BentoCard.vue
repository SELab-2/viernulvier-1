<template>
  <div
    class="group relative flex flex-col justify-end overflow-hidden rounded-2xl bg-surface-2 p-5 min-h-44"
  >
    <span
      class="material-symbols-outlined absolute right-5 top-5 text-3xl text-ink-tertiary opacity-30"
    >
      {{ icon }}
    </span>
    <span class="mb-1 text-xs font-semibold uppercase tracking-widest text-ink-secondary">
      {{ t(labelKey) }}
    </span>
    <h3 class="text-base font-bold text-ink-primary">{{ t(titleKey) }}</h3>
    <p class="mt-1 text-xs leading-relaxed text-ink-tertiary">
      {{ t(descriptionKey) }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

defineProps<{
  labelKey: string;
  titleKey: string;
  descriptionKey: string;
  icon: string;
}>();

const { t } = useI18n();
</script>
