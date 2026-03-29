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
          <template v-if="stat.value !== null">
            {{ stat.formatted }}
          </template>
          <span v-else class="inline-block h-9 w-16 animate-pulse rounded bg-surface-3" />
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
    value: stats.value.productions,
    formatted: stats.value.productions !== null ? formatNumber(stats.value.productions) : null,
    labelKey: "stats.productions",
  },
  {
    value: stats.value.events,
    formatted: stats.value.events !== null ? formatNumber(stats.value.events) : null,
    labelKey: "stats.events",
  },
  {
    value: stats.value.yearsOfHistory,
    formatted: stats.value.yearsOfHistory !== null ? formatNumber(stats.value.yearsOfHistory) : null,
    labelKey: "stats.yearsOfHistory",
  },
  {
    value: stats.value.genres,
    formatted: stats.value.genres !== null ? formatNumber(stats.value.genres) : null,
    labelKey: "stats.genres",
  },
]);
</script>
