<template>
  <!--
    Landing-page masthead. Reads as the front page of an archive:
    a small dateline, a heavy editorial title, a lead paragraph with
    a drop-cap, and a prominent search bar that deeplinks into the
    productions list. The page rhythm starts on a dark surface.
  -->
  <section class="relative overflow-hidden bg-surface-inv px-6 py-20 lg:px-10 lg:py-28">
    <!--
      Atmospheric backdrop. The photo is filtered to unify it with the
      paper palette (DESIGN.md §8) — it reads as a textured ground, not
      as content. Text and search stay dominant in front.
    -->
    <img
      src="@/assets/images/hero.webp"
      alt=""
      aria-hidden="true"
      width="2400"
      height="1600"
      class="hero-photo absolute inset-0 h-full w-full object-cover"
    />
    <div class="hero-overlay absolute inset-0" aria-hidden="true" />

    <div class="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
      <!-- Dateline: thin rule on each side, small caps in the middle -->
      <div
        class="mb-8 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-ink-on-inv-secondary"
      >
        <span
          class="h-px w-8 bg-ink-on-inv-tertiary opacity-50"
          aria-hidden="true"
        />
        <span class="whitespace-nowrap">{{ t("hero.dateline") }}</span>
        <span
          class="h-px w-8 bg-ink-on-inv-tertiary opacity-50"
          aria-hidden="true"
        />
      </div>

      <!-- Title -->
      <h1
        class="font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-ink-on-inv md:text-5xl lg:text-6xl"
      >
        {{ t("hero.title") }}
      </h1>

      <!-- Lead paragraph with drop-cap -->
      <p
        class="hero-lead mt-10 max-w-2xl font-serif text-base leading-[1.7] text-ink-on-inv md:text-lg text-justify hyphens-auto"
      >
        {{ t("hero.lead") }}
      </p>

      <!-- Search form -->
      <form
        class="mt-12 w-full max-w-2xl"
        role="search"
        @submit.prevent="onSubmit"
      >
        <label for="home-search" class="sr-only">
          {{ t("hero.searchLabel") }}
        </label>
        <div
          class="flex items-stretch border-2 border-ink-on-inv bg-surface-0 text-ink-primary shadow-[0_2px_0_0_var(--surface-inv-border)]"
        >
          <input
            id="home-search"
            v-model="query"
            type="search"
            :placeholder="t('hero.searchPlaceholder')"
            class="flex-1 bg-transparent px-5 py-4 font-serif text-base text-ink-primary placeholder:font-serif placeholder:italic placeholder:text-ink-tertiary focus:outline-none md:text-lg"
            autocomplete="off"
            spellcheck="false"
          />
          <button
            type="submit"
            class="flex items-center gap-2 border-l-2 border-surface-3 bg-accent-dark px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-surface-0 transition hover:bg-accent-dark-hover"
          >
            <span>{{ t("hero.searchSubmit") }}</span>
            <svg
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </button>
        </div>
      </form>

      <!-- Stat line + browse-all link -->
      <div
        class="mt-6 flex flex-col items-center gap-2 text-xs uppercase tracking-[0.18em] text-ink-on-inv-tertiary sm:flex-row sm:gap-5"
      >
        <span class="font-semibold">
          {{ t("hero.searchHint", { count: formattedProductions }) }}
        </span>
        <span
          class="hidden h-1 w-1 rounded-full bg-ink-on-inv-tertiary opacity-60 sm:block"
          aria-hidden="true"
        />
        <RouterLink
          :to="{ name: RouteNames.PRODUCTIONS, params: { lang: currentLang } }"
          class="font-semibold text-ink-on-inv-secondary underline decoration-1 underline-offset-4 transition hover:text-ink-on-inv"
        >
          {{ t("hero.browseAll") }}
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { i18n, type SupportedLang } from "@/i18n";
import { RouteNames } from "@/router/routeNames";
import { useArchiveStats } from "@/composables/useArchiveStats";

const { t } = useI18n();
const router = useRouter();
const { stats } = useArchiveStats();

const currentLang = computed(
  () => i18n.global.locale.value as SupportedLang,
);

const query = ref("");

/**
 * Format the productions count with the Dutch thousands separator
 * regardless of UI locale — the number itself is a Belgian artefact
 * and reads consistently across nl/fr/en.
 */
const formattedProductions = computed(() =>
  stats.value.productions.toLocaleString("nl-BE"),
);

/**
 * Submit the search. We forward the trimmed query to ProductionsView
 * via the `?search=` deeplink it already reads (SEARCH_QUERY_KEY).
 * An empty submit still navigates — visitors get the unfiltered list.
 */
function onSubmit() {
  const trimmed = query.value.trim();
  // Fire-and-forget navigation; we don't need to await the resulting
  // route transition for the form-submit handler to complete.
  void router.push({
    name: RouteNames.PRODUCTIONS,
    params: { lang: currentLang.value },
    query: trimmed ? { search: trimmed } : {},
  });
}
</script>

<style scoped>
@reference "@/style.css";

/*
 * Photographic treatment. The image fades into the dark surface
 * (DESIGN.md §8) so it reads as atmospheric ground rather than
 * foreground content. A bottom-to-top gradient strengthens the
 * paper-overlay effect and improves text contrast.
 */
.hero-photo {
  opacity: calc(1 - var(--photo-opacity));
}

.hero-overlay {
  background: linear-gradient(
    to top,
    var(--photo-overlay) 0%,
    transparent 70%
  );
  opacity: var(--photo-opacity);
}

/*
 * Drop cap on the lead paragraph. Mirrors the recipe used in
 * ProductionDetail's DetailsSection so the editorial vocabulary
 * stays consistent across the site.
 *
 * Modern browsers honour `initial-letter`, sizing the cap so it
 * spans exactly N body lines. Older browsers fall back to a
 * float-based cap.
 */
.hero-lead::first-letter {
  font-family: var(--font-serif);
  font-weight: 700;
  color: var(--ink-on-inv);
  margin-right: 0.4rem;
  -webkit-initial-letter: 3;
  initial-letter: 3;
}

@supports not ((initial-letter: 3) or (-webkit-initial-letter: 3)) {
  .hero-lead::first-letter {
    float: left;
    font-size: 4.8em;
    line-height: 1;
    margin: 0.05em 0.5rem 0 0;
  }
}
</style>
