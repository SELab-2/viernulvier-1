<template>
  <section class="border-y border-surface-3 bg-surface-1 px-6 py-12">
    <div class="mx-auto grid max-w-6xl grid-cols-2 gap-6 sm:grid-cols-4">
      <div
        v-for="stat in displayStats"
        :key="stat.labelKey"
        class="flex flex-col items-center gap-1 text-center"
      >
        <span
          class="text-3xl font-black tracking-tight text-ink-primary lg:text-4xl"
        >
          {{ stat.formatted }}
        </span>
        <span class="text-sm font-medium text-stat-label">
          {{ t(stat.labelKey) }}
        </span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useArchiveStats } from "@/composables/useArchiveStats";

const { t } = useI18n();
const { stats } = useArchiveStats();

/**
 * Format a number with a locale-aware separator (e.g. 12.482 in NL, 12,482 in EN).
 */
function formatNumber(n: number): string {
  return n.toLocaleString("nl-BE");
}

const displayStats = computed(() => [
  {
    formatted: formatNumber(stats.value.productions),
    labelKey: "stats.productions",
  },
  {
    formatted: formatNumber(stats.value.events),
    labelKey: "stats.events",
  },
  {
    formatted: formatNumber(stats.value.yearsOfHistory),
    labelKey: "stats.yearsOfHistory",
  },
  {
    formatted: formatNumber(stats.value.genres),
    labelKey: "stats.genres",
  },
]);
</script>
