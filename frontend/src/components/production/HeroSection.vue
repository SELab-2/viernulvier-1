<template>
  <!-- Editorial header for a production page. -->
  <article class="relative bg-surface-1">
    <!-- Banner photograph -->
    <div
      class="relative w-full overflow-hidden bg-surface-inv h-[45vh] md:h-[55vh]"
    >
      <img
        v-if="bannerUrl"
        :src="bannerUrl"
        :alt="heroImageAlt"
        class="h-full w-full object-cover object-center"
        loading="eager"
        decoding="async"
        referrerPolicy="no-referrer"
      />
    </div>

    <!-- Letterpress card sitting over the bottom of the photograph -->
    <header class="relative z-10 mx-auto -mt-40 max-w-2xl px-6 md:-mt-56 md:max-w-3xl md:px-0">
      <div
        class="border border-ink-primary bg-surface-0 px-6 py-8 text-center opacity-0 animate-fade-up md:px-12 md:py-10"
      >
        <!-- Kicker: thin rule on each side, small caps in the middle -->
        <div
          v-if="kicker"
          class="mb-6 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-ink-secondary"
        >
          <span
            class="h-px w-8 bg-ink-tertiary opacity-50"
            aria-hidden="true"
          />
          <span class="whitespace-nowrap">{{ kicker }}</span>
          <span
            class="h-px w-8 bg-ink-tertiary opacity-50"
            aria-hidden="true"
          />
        </div>

        <!-- Artist (primary identifier in this archive) -->
        <p
          v-if="content.artist"
          class="mb-3 font-serif italic text-xl font-medium text-ink-primary md:text-2xl"
        >
          {{ content.artist }}
        </p>

        <!-- Title -->
        <h1
          class="font-serif text-3xl font-semibold leading-[1.05] tracking-tight text-ink-primary md:text-5xl"
        >
          {{ content.title }}
        </h1>

        <!-- Deck / tagline -->
        <p
          v-if="content.tagline"
          class="mt-4 font-serif text-lg font-light italic leading-snug text-ink-secondary md:text-xl"
        >
          {{ content.tagline }}
        </p>

        <!--
          Run period + running time. Compact, sober, no caps.
          Format: "12.4.1987 — 14.4.1987 · 1 u 30"
        -->
        <p
          v-if="dateMetaLine"
          class="mt-5 text-xs tracking-[0.12em] text-ink-secondary md:text-sm"
        >
          {{ dateMetaLine }}
        </p>
      </div>
    </header>

    <!-- Breathing room before the next section -->
  </article>
</template>

<script setup lang="ts">
import { type SupportedLang } from "@/i18n";
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared";
import { computed } from "vue";
import { localizeOrEmpty, type LanguageMap } from "@/utils/language-utils";
import { useI18n } from "vue-i18n";
import {
  formatDurationMinutesI18n,
  formatNumericDate,
} from "@/utils/date";

interface Props {
  production: ProductionWithBackwardsRefs;
  tagGroups: { label: string; tags: string[] }[];
  eventStats: {
    firstDate: Date;
    lastDate: Date;
    durationMinutes: number | null;
    hasMultipleDays: boolean;
  } | null;
  /** First gallery image (`FE3_home_featuredWide` crop); when null, solid dark hero. */
  bannerUrl?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  bannerUrl: null,
});
const { t, locale } = useI18n();

const heroImageAlt = computed(() => {
  const lang = locale.value as SupportedLang;
  return (
    localizeOrEmpty(props.production.title ?? {}, lang).trim() ||
    t("production.hero.bannerImageAlt")
  );
});

const content = computed(() => {
  const lang = locale.value as SupportedLang;
  const translate = (map?: LanguageMap | null) =>
    localizeOrEmpty(map ?? {}, lang);

  return {
    artist: translate(props.production.artist),
    title: translate(props.production.title),
    supertitle: translate(props.production.supertitle),
    tagline: translate(props.production.tagline),
  };
});

/** Primary genre tag, when one is available. */
const primaryGenre = computed(() => {
  const genreGroup = props.tagGroups.find((g) =>
    g.label.toLowerCase().includes("genre"),
  );
  return genreGroup?.tags[0] ?? "";
});

/** Year of the first event, used as the dateline in the kicker. */
const year = computed(() => {
  const first = props.eventStats?.firstDate;
  if (!first) return "";
  return String(first.getFullYear());
});

/** Compose the dateline-style kicker from supertitle, genre and year.
 *  Empty parts are skipped; duplicates are collapsed so we never print
 *  e.g. "Theater · Theater · 1987". */
const kicker = computed(() => {
  const parts: string[] = [];
  const seen = new Set<string>();

  for (const part of [
    content.value.supertitle,
    primaryGenre.value,
    year.value,
  ]) {
    const trimmed = part?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(trimmed);
  }

  return parts.join(" · ");
});

/** Compact run-period + running-time strip placed below the deck. */
const dateMetaLine = computed(() => {
  const stats = props.eventStats;
  if (!stats) return "";

  const parts: string[] = [];

  if (stats.firstDate) {
    const start = formatNumericDate(stats.firstDate, locale.value);
    if (stats.hasMultipleDays && stats.lastDate) {
      const end = formatNumericDate(stats.lastDate, locale.value);
      parts.push(`${start} — ${end}`);
    } else {
      parts.push(start);
    }
  }

  if (stats.durationMinutes !== null && stats.durationMinutes > 0) {
    parts.push(formatDurationMinutesI18n(stats.durationMinutes, t));
  }

  return parts.join(" · ");
});
</script>
