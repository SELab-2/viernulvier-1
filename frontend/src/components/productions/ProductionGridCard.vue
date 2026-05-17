<template>
  <RouterLink
    :to="{
      name: RouteNames.PRODUCTION_DETAIL,
      params: { lang: locale, id: production.id },
    }"
    class="production-grid-card group flex h-full flex-col gap-4 rounded-md border border-surface-3 bg-surface-0 p-4 transition-colors hover:border-accent-outline hover:bg-surface-1/60 dark:bg-surface-1 sm:p-5"
    :style="{ '--production-grid-stagger': `${staggerDelayMs}ms` }"
  >
    <!--
      Same shape (1920/900) as the list card's placeholder tile so list and
      grid thumbnails feel like the same product. Grid is wider, hence taller.
    -->
    <div
      :class="[
        'aspect-[1920/900] w-full overflow-hidden rounded-md',
        useLogoFallback ? 'flex items-center justify-center bg-surface-2 p-4' : 'bg-surface-2',
      ]"
      aria-hidden="true"
    >
      <img
        v-if="resolvedThumbSrc"
        :src="resolvedThumbSrc"
        alt=""
        :class="
          useLogoFallback
            ? 'block h-auto max-h-12 w-auto max-w-[50%] object-contain opacity-90 sm:max-h-14'
            : 'block h-full w-full object-cover'
        "
        loading="lazy"
        decoding="async"
      />
    </div>

    <div class="flex min-w-0 flex-1 flex-col">
      <div class="min-w-0">
        <h2
          class="font-serif text-xl font-semibold leading-tight tracking-tight text-ink-primary md:text-2xl"
        >
          {{ title }}
        </h2>

        <p
          v-if="artist"
          class="mt-1 font-serif text-base italic text-ink-secondary md:text-lg"
        >
          {{ artist }}
        </p>
      </div>

      <p
        v-if="dateSummary.line"
        class="mt-3 font-serif text-sm leading-tight tabular-nums text-ink-secondary md:text-base"
      >
        <span class="whitespace-nowrap">{{ dateSummary.line }}</span>
        <span
          v-if="dateSummary.moreCount > 0"
          class="ml-1 whitespace-nowrap font-sans text-xs not-italic text-ink-tertiary"
        >
          {{
            t("productionsPage.morePerformances", {
              n: dateSummary.moreCount,
            })
          }}
        </span>
      </p>

      <div
        v-if="visibleTagChips.length"
        class="mt-auto flex flex-wrap items-center gap-2 pt-4"
      >
        <span
          v-for="chip in visibleTagChips"
          :key="chip.tagId"
          class="rounded-sm px-2.5 py-1 text-xs font-medium uppercase tracking-wide"
          :class="
            chip.isGenre
              ? 'bg-tag-genre-bg text-tag-genre-text'
              : 'border border-surface-3 bg-surface-1 text-ink-secondary'
          "
        >
          {{ chip.label }}
        </span>
        <span
          v-if="hiddenTagCount > 0"
          class="text-xs font-medium tabular-nums tracking-wide text-ink-tertiary"
        >
          {{ t("productionsPage.moreGridTags", { n: hiddenTagCount }) }}
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
import { useDarkMode } from "@/composables/useDarkMode";

const PLACEHOLDER_THUMB_LIGHT_SRC = new URL(
  "../../assets/images/placeholder-light.svg",
  import.meta.url,
).href;

const PLACEHOLDER_THUMB_DARK_SRC = new URL(
  "../../assets/images/placeholder-dark.svg",
  import.meta.url,
).href;

/**
 * Grid cards align in rows of equal height, so cap visible chips and roll the
 * rest into a "+n" indicator to keep card heights consistent.
 */
const MAX_VISIBLE_GRID_TAGS = 3;

const props = withDefaults(
  defineProps<{
    production: ProductionWithBackwardsRefs;
    dateSummary: ProductionDateSummary;
    tagChips: ProductionTagChip[];
    /**
     * Crop URL when set; theme placeholder when `null` (no list media);
     * loading tile when `undefined`.
     */
    thumbnailUrl?: string | null | undefined;
    /** Used to stagger the grid entrance animation. */
    rowIndex?: number;
  }>(),
  { rowIndex: 0, thumbnailUrl: undefined },
);

const useLogoFallback = computed(
  () => props.thumbnailUrl === null || props.thumbnailUrl === "",
);

const { isDark } = useDarkMode();
const { t, locale } = useI18n();

const placeholderThumbSrc = computed(() =>
  isDark.value ? PLACEHOLDER_THUMB_DARK_SRC : PLACEHOLDER_THUMB_LIGHT_SRC,
);

const resolvedThumbSrc = computed(() => {
  if (props.thumbnailUrl === undefined) {
    return null;
  }
  if (props.thumbnailUrl === null || props.thumbnailUrl === "") {
    return placeholderThumbSrc.value;
  }
  return props.thumbnailUrl;
});

const visibleTagChips = computed(() =>
  props.tagChips.slice(0, MAX_VISIBLE_GRID_TAGS),
);

const hiddenTagCount = computed(() =>
  Math.max(0, props.tagChips.length - MAX_VISIBLE_GRID_TAGS),
);

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
