<template>
  <section
    class="border-y border-zinc-200 bg-white px-6 py-12 dark:border-zinc-800 dark:bg-zinc-900"
  >
    <div class="mx-auto grid max-w-6xl grid-cols-2 gap-6 sm:grid-cols-4">
      <div
        v-for="stat in stats"
        :key="stat.value"
        class="flex flex-col items-center gap-1 text-center"
      >
        <span
          class="text-3xl font-black tracking-tight text-zinc-900 dark:text-white lg:text-4xl"
        >
          {{ stat.value }}
        </span>
        <span class="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {{ t(stat.labelKey) }}
        </span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const stats = [
  { value: "12.482", labelKey: "stats.totalRecords" },
  { value: "42", labelKey: "stats.yearsCovered" },
  { value: "315", labelKey: "stats.originalSeries" },
  { value: "8.200+", labelKey: "stats.digitizedWorks" },
];
</script>
