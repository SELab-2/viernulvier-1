<template>
  <!--
    Editorial header for a production page.

    A full-colour banner photograph fills the top of the section, and
    the article header floats over the lower half of the photo inside
    a "letterpress" card — a sober, square, paper-coloured frame with
    a thin ink-coloured border, like a museum label or magazine title
    plate. The card carries the kicker, the serif headline, an italic
    deck and a small byline.

    The right-hand "ticket info" column (date range, running time,
    genre chips) is intentionally absent here — those facts belong to
    EventsSection / DetailsSection where the reader expects them.
  -->
  <article class="relative bg-surface-0">
    <!-- Banner photograph -->
    <div
      class="relative w-full overflow-hidden bg-surface-inv h-[55vh] md:h-[65vh]"
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
    <header class="relative z-10 mx-auto -mt-32 max-w-2xl px-6 md:-mt-44 md:px-0">
      <div
        class="border border-ink-primary bg-surface-0 px-6 py-10 text-center opacity-0 animate-fade-up md:px-12 md:py-14"
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

        <!-- Headline -->
        <h1
          class="font-serif text-3xl font-semibold leading-[1.1] tracking-tight text-ink-primary md:text-5xl"
        >
          {{ content.title }}
        </h1>

        <!-- Deck / tagline -->
        <p
          v-if="content.tagline"
          class="mt-5 font-serif text-lg font-light italic leading-snug text-ink-secondary md:text-xl"
        >
          {{ content.tagline }}
        </p>

        <!-- Byline -->
        <p
          v-if="content.artist"
          class="mt-7 text-xs uppercase tracking-[0.2em] text-ink-tertiary"
        >
          {{ content.artist }}
        </p>
      </div>
    </header>

    <!--
      Photo dateline — a single sober italic caption beneath the kadertje.
      Places the image as archival material rather than promotional art.
    -->
    <p
      class="mx-auto mt-6 max-w-2xl px-6 text-center font-serif text-xs italic text-ink-tertiary md:px-0 md:text-sm"
    >
      {{ t("production.hero.caption") }}
    </p>

    <!-- Breathing room before the next section -->
    <div class="h-12 md:h-16" aria-hidden="true" />
  </article>
</template>

<script setup lang="ts">
import { type SupportedLang } from "@/i18n";
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared";
import { computed } from "vue";
import { localizeOrEmpty, type LanguageMap } from "@/utils/language-utils";
import { useI18n } from "vue-i18n";

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
</script>
