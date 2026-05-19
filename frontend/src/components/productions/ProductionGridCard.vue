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
      Same shape (1920/900) as the list card's placeholder tile so list and
      grid thumbnails feel like the same product. Edge-to-edge: no padding
      around the image, only the card's border clips its top corners.
    -->
    <div
      :class="[
        'aspect-[1920/900] w-full',
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

    <div class="flex min-w-0 flex-1 flex-col gap-2.5 px-3 py-3 sm:px-4 sm:py-3.5">
      <div class="min-w-0">
        <h2
          class="truncate font-serif text-xl font-semibold leading-tight tracking-tight text-ink-primary md:text-[1.3125rem]"
        >
          {{ title }}
        </h2>

        <p
          v-if="artist"
          class="mt-1 truncate font-serif text-sm italic leading-snug text-ink-secondary md:text-base"
        >
          {{ artist }}
        </p>
      </div>

      <p
        v-if="dateSummary.line"
        class="flex items-start gap-1 font-serif text-sm leading-tight tabular-nums text-ink-secondary"
      >
        <EventCalendarIcon
          class="mt-0.5 size-[0.9rem] shrink-0 text-ink-tertiary"
        />
        <span class="min-w-0">
          <span class="whitespace-nowrap">{{ dateSummary.line }}</span>
          <span
            v-if="dateSummary.moreCount > 0"
            class="whitespace-nowrap font-sans text-xs not-italic text-ink-tertiary"
          >
            ({{
              t("productionsPage.morePerformances", {
                n: dateSummary.moreCount,
              })
            }})
          </span>
        </span>
      </p>

      <div
        v-if="tagChips.length"
        :ref="setRowRef"
        class="mt-auto flex w-full flex-wrap items-center gap-1.5 overflow-hidden pt-1.5"
      >
        <span
          v-for="item in visibleTagPills"
          :key="item.id"
          :ref="(el) => setPillRef(item.id, el)"
          class="rounded-sm px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
          :class="
            item.chip.isGenre
              ? 'bg-tag-genre-bg text-tag-genre-text'
              : 'border border-surface-3 bg-surface-1 text-ink-secondary'
          "
        >
          {{ item.chip.label }}
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
import EventCalendarIcon from "@/components/icons/EventCalendarIcon.vue";
import { localizeWithFallback, localizeOrEmpty } from "@/utils/language-utils";
import type { ProductionDateSummary } from "@/utils/productionsOverview";
import type { ProductionTagChip } from "@/utils/tagDisplay";
import { useDarkMode } from "@/composables/useDarkMode";
import { useFittingPills } from "@/composables/useFittingPills";

const PLACEHOLDER_THUMB_LIGHT_SRC = new URL(
  "../../assets/images/placeholder-light.svg",
  import.meta.url,
).href;

const PLACEHOLDER_THUMB_DARK_SRC = new URL(
  "../../assets/images/placeholder-dark.svg",
  import.meta.url,
).href;

/** JSDOM fallback when row width is not measurable. Real browsers measure. */
const TAG_PILL_FALLBACK_VISIBLE = 4;

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

/**
 * `useFittingPills` items need an `id`; wrap the chips so we can reuse
 * the same row-fit logic the productions filter uses for genre pills.
 */
const tagPillItems = computed(() =>
  props.tagChips.map((chip) => ({ id: chip.tagId, chip })),
);

const { setRowRef, setPillRef, visibleItems: visibleTagPills } = useFittingPills(
  tagPillItems,
  { gapPx: 6, fallbackVisibleCount: TAG_PILL_FALLBACK_VISIBLE },
);

const staggerDelayMs = computed(() =>
  Math.min((props.rowIndex ?? 0) * 40, 520),
);

const title = computed(() =>
  localizeWithFallback(props.production.title, (map) => localizeOrEmpty(map, locale.value as SupportedLang)),
);
const artist = computed(() =>
  localizeWithFallback(props.production.artist, (map) => localizeOrEmpty(map, locale.value as SupportedLang)),
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
