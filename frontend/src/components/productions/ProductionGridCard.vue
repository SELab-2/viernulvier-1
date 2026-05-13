<template>
  <RouterLink
    :to="{
      name: RouteNames.PRODUCTION_DETAIL,
      params: { lang: locale, id: production.id },
    }"
    class="production-grid-card group flex h-full flex-col overflow-hidden rounded-md border border-surface-3 bg-surface-0 transition-colors hover:border-accent-outline hover:bg-surface-1/60 dark:bg-surface-1"
    :style="{ '--production-grid-stagger': `${staggerDelayMs}ms` }"
  >
    <!--
      Fixed aspect ratio so cards line up across the grid even when crops differ.
      Placeholder surface shows when no thumbnail is available.
    -->
    <div
      class="relative w-full overflow-hidden bg-surface-2"
      style="aspect-ratio: 4 / 3"
      aria-hidden="true"
    >
      <img
        v-if="thumbnailUrl"
        :src="thumbnailUrl"
        alt=""
        class="absolute inset-0 block h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        loading="lazy"
        decoding="async"
      />
    </div>

    <div class="flex min-w-0 flex-1 flex-col gap-3 p-4 md:p-5">
      <div class="min-w-0">
        <h2
          class="text-lg font-bold leading-tight tracking-tight text-ink-primary md:text-xl"
        >
          {{ title }}
        </h2>

        <p
          v-if="artist"
          class="mt-1 text-sm font-medium text-ink-secondary md:text-base"
        >
          {{ artist }}
        </p>
      </div>

      <div
        v-if="dateSummary.line || hallsText"
        class="flex flex-col gap-1.5 text-sm text-ink-secondary"
      >
        <p
          v-if="dateSummary.line"
          class="flex items-start gap-1.5 tabular-nums"
        >
          <svg
            class="mt-0.5 size-[0.9rem] shrink-0 text-ink-tertiary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <span class="min-w-0">
            <span class="whitespace-nowrap">{{ dateSummary.line }}</span>
            <span
              v-if="dateSummary.moreCount > 0"
              class="ml-1 whitespace-nowrap text-xs text-ink-tertiary"
            >
              {{
                t("productionsPage.morePerformances", {
                  n: dateSummary.moreCount,
                })
              }}
            </span>
          </span>
        </p>

        <p
          v-if="hallsText"
          class="flex items-start gap-1.5"
        >
          <svg
            class="mt-0.5 size-[0.9rem] shrink-0 text-ink-tertiary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span class="min-w-0">{{ hallsText }}</span>
        </p>
      </div>

      <div
        v-if="tagChips.length"
        class="mt-auto flex flex-wrap items-center gap-1.5 pt-1 text-xs"
      >
        <span
          v-for="chip in tagChips"
          :key="chip.tagId"
          class="rounded-full px-2.5 py-1 font-medium"
          :class="
            chip.isGenre
              ? 'bg-tag-genre-bg text-tag-genre-text'
              : 'border border-ink-primary bg-transparent text-ink-primary'
          "
        >
          {{ chip.label }}
        </span>
      </div>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared";
import type { SupportedLang } from "@/i18n";
import { RouteNames } from "@/router/routeNames";
import { localizeOrEmpty } from "@/utils/language-utils";
import type { ProductionDateSummary } from "@/utils/productionsOverview";
import type { ProductionTagChip } from "@/utils/tagDisplay";

const props = withDefaults(
  defineProps<{
    production: ProductionWithBackwardsRefs;
    dateSummary: ProductionDateSummary;
    tagChips: ProductionTagChip[];
    hallsText: string;
    /** Public crop URL (`/media/crops/…`) for the grid thumbnail, if any. */
    thumbnailUrl?: string | null;
    /** Used to stagger the grid entrance animation. */
    rowIndex?: number;
  }>(),
  { rowIndex: 0, thumbnailUrl: null },
);

const { t, locale } = useI18n();

/** Cap delay so long pages do not stretch the sequence too far. */
const staggerDelayMs = computed(() =>
  Math.min((props.rowIndex ?? 0) * 40, 520),
);

const title = computed(() =>
  localizeOrEmpty(props.production.title, locale.value as SupportedLang),
);
const artist = computed(() =>
  localizeOrEmpty(props.production.artist, locale.value as SupportedLang),
);
</script>

<style scoped>
.production-grid-card {
  animation: production-grid-card-in 0.42s ease-out both;
  animation-delay: var(--production-grid-stagger, 0ms);
}

@keyframes production-grid-card-in {
  from {
    opacity: 0;
    transform: translateY(0.5rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .production-grid-card {
    animation: none;
    opacity: 1;
  }
}
</style>
