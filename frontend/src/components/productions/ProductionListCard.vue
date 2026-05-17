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
      class="relative w-52 shrink-0 self-start sm:w-60 md:w-72"
      aria-hidden="true"
    >
      <div
        :class="[
          'overflow-hidden rounded-md',
          thumbLoading || useLogoFallback
            ? 'aspect-[1920/900] w-full bg-surface-2'
            : 'bg-transparent',
          useLogoFallback ? 'flex items-center justify-center p-4' : '',
        ]"
      >
        <img
          v-if="resolvedThumbSrc"
          :src="resolvedThumbSrc"
          alt=""
          :class="
            useLogoFallback
              ? 'block h-auto max-h-11 w-auto max-w-[50%] object-contain opacity-90 sm:max-h-12'
              : 'block h-auto w-full max-h-96 rounded-md object-contain object-left'
          "
          loading="lazy"
          decoding="async"
        />
      </div>
    </div>

    <div class="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <!--
        Dates are absolutely positioned so a second line (“& n more”) does not
        grow the title row and push the artist down.
      -->
      <div
        class="absolute right-0 top-0 z-10 max-w-[12rem] text-right font-serif text-base leading-tight text-ink-secondary tabular-nums sm:max-w-[14rem] md:text-lg"
      >
        <span class="whitespace-nowrap">{{ dateSummary.line }}</span>
        <span
          v-if="dateSummary.moreCount > 0"
          class="mt-1 block font-sans text-xs font-normal not-italic text-ink-tertiary"
        >
          {{
            t("productionsPage.morePerformances", {
              n: dateSummary.moreCount,
            })
          }}
        </span>
      </div>

      <div class="-mt-0.5 min-w-0">
        <h2
          class="pr-[12rem] font-serif text-2xl font-semibold leading-tight tracking-tight text-ink-primary sm:pr-[14rem] md:text-2xl"
        >
          {{ title }}
        </h2>

        <p
          v-if="artist"
          class="mt-1 pr-[12rem] font-serif text-lg italic text-ink-secondary sm:pr-[14rem] md:text-lg"
        >
          {{ artist }}
        </p>

        <p
          v-if="hallsText"
          class="mt-3 flex items-start gap-1 text-sm text-ink-secondary"
        >
          <MapPinOutlineIcon class="mt-0.5 size-[0.9rem] shrink-0 text-ink-tertiary" />
          <span>{{ hallsText }}</span>
        </p>
      </div>

      <div
        v-if="tagChips.length"
        class="mt-auto flex flex-wrap items-center gap-2 pt-4.5"
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
          {{ t("productionsPage.moreListTags", { n: hiddenTagCount }) }}
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
import MapPinOutlineIcon from "@/components/icons/MapPinOutlineIcon.vue";
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

/** Beyond this count, remaining tags are summarized as localized “+n more”. */
const MAX_VISIBLE_LIST_TAGS = 5;

const props = withDefaults(
  defineProps<{
    production: ProductionWithBackwardsRefs;
    dateSummary: ProductionDateSummary;
    tagChips: ProductionTagChip[];
    hallsText: string;
    /**
     * Crop URL when set; theme placeholder when `null` (no list media);
     * loading tile when `undefined`.
     */
    thumbnailUrl?: string | null | undefined;
    /** Used to stagger the row entrance animation on the productions list. */
    rowIndex?: number;
  }>(),
  { rowIndex: 0, thumbnailUrl: undefined },
);

const thumbLoading = computed(() => props.thumbnailUrl === undefined);

const useLogoFallback = computed(
  () => props.thumbnailUrl === null || props.thumbnailUrl === "",
);

const { isDark } = useDarkMode();

/** Placeholder graphic when there is no usable list crop (light vs dark). */
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

const { t, locale } = useI18n();

const visibleTagChips = computed(() =>
  props.tagChips.slice(0, MAX_VISIBLE_LIST_TAGS),
);

const hiddenTagCount = computed(() =>
  Math.max(0, props.tagChips.length - MAX_VISIBLE_LIST_TAGS),
);

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
