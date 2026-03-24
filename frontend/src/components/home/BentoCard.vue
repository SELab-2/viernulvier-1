<template>
  <div
    :class="[
      'group relative flex flex-col justify-end overflow-hidden rounded-2xl p-5 min-h-44',
      bgClass,
    ]"
  >
    <span
      class="material-symbols-outlined absolute right-5 top-5 text-3xl opacity-20"
      :class="accentClass"
    >
      {{ icon }}
    </span>
    <span
      class="mb-1 text-xs font-semibold uppercase tracking-widest"
      :class="accentClass"
    >
      {{ t(labelKey) }}
    </span>
    <h3 class="text-base font-bold text-white">{{ t(titleKey) }}</h3>
    <p class="mt-1 text-xs leading-relaxed text-zinc-400">
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
  bgClass: string;
  accentClass: string;
}>();

const { t } = useI18n();
</script>
