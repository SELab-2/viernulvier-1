<template>
  <RouterLink
    :to="{
      name: RouteNames.PRODUCTION_DETAIL,
      params: { lang: locale, id: production.id },
    }"
    class="production-list-card group -mx-3 flex items-stretch gap-4 border-b border-surface-3 px-3 py-8 transition-colors last:border-b-0 hover:bg-surface-1/60 sm:-mx-4 sm:gap-6 sm:px-4 md:-mx-5 md:gap-8 md:px-5"
    :style="{ '--production-list-stagger': `${staggerDelayMs}ms` }"
  >
    <div
      class="relative h-28 w-24 shrink-0 overflow-hidden rounded-md bg-surface-2 sm:h-32 sm:w-28 md:h-36 md:w-32"
      aria-hidden="true"
    />

    <div class="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <!--
        Dates are absolutely positioned so a second line (“& n more”) does not
        grow the title row and push the artist down.
      -->
      <div
        v-if="dateSummary.line"
        class="absolute right-0 top-0 z-10 max-w-[11rem] text-right text-sm text-ink-secondary sm:max-w-[13rem]"
      >
        <span class="whitespace-nowrap">{{ dateSummary.line }}</span>
        <span
          v-if="dateSummary.moreCount > 0"
          class="mt-0.5 block text-xs text-ink-tertiary"
        >
          {{
            t("productionsPage.morePerformances", {
              n: dateSummary.moreCount,
            })
          }}
        </span>
      </div>

      <div class="min-w-0">
        <h2
          class="text-xl font-bold leading-tight tracking-tight text-ink-primary md:text-2xl"
          :class="dateSummary.line ? 'pr-[12rem] sm:pr-[14rem]' : ''"
        >
          {{ title }}
        </h2>

        <p
          v-if="artist"
          class="mt-1 text-base font-medium text-ink-secondary md:text-lg"
        >
          {{ artist }}
        </p>

        <p
          v-if="hallsText"
          class="mt-4 flex items-start gap-1 text-sm text-ink-secondary"
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
          <span>{{ hallsText }}</span>
        </p>
      </div>

      <div
        v-if="tagChips.length"
        class="mt-auto flex flex-wrap items-center gap-2 pt-4 text-xs"
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
    /** Used to stagger the row entrance animation on the productions list. */
    rowIndex?: number;
  }>(),
  { rowIndex: 0 },
);

const { t, locale } = useI18n();

/** Cap delay so long pages do not stretch the sequence too far. */
const staggerDelayMs = computed(() =>
  Math.min((props.rowIndex ?? 0) * 52, 650),
);

const title = computed(() =>
  localizeOrEmpty(props.production.title, locale.value as SupportedLang),
);
const artist = computed(() =>
  localizeOrEmpty(props.production.artist, locale.value as SupportedLang),
);
</script>

<style scoped>
.production-list-card {
  animation: production-list-card-in 0.42s ease-out both;
  animation-delay: var(--production-list-stagger, 0ms);
}

@keyframes production-list-card-in {
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
  .production-list-card {
    animation: none;
    opacity: 1;
  }
}
</style>
