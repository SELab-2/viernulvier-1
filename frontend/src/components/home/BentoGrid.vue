<template>
  <section class="bg-zinc-50 px-6 py-16 dark:bg-zinc-950 lg:px-10">
    <div class="mx-auto max-w-6xl">
      <h2 class="mb-8 text-2xl font-bold text-zinc-900 dark:text-white">
        {{ t("bento.title") }}
      </h2>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <!-- Featured card — spans 2 columns on large screens -->
        <div
          class="group relative flex flex-col justify-end overflow-hidden rounded-2xl bg-zinc-900 p-6 lg:col-span-2 lg:row-span-2 min-h-72"
        >
          <div
            class="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950"
          />
          <span
            class="relative z-10 mb-3 w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white"
          >
            {{ t("bento.featured.label") }}
          </span>
          <h3 class="relative z-10 text-2xl font-bold text-white">
            {{ t("bento.featured.title") }}
          </h3>
          <p class="relative z-10 mt-2 text-sm leading-relaxed text-zinc-400">
            {{ t("bento.featured.description") }}
          </p>
          <RouterLink
            :to="{
              name: RouteNames.PRODUCTIONS,
              params: { lang: currentLang },
            }"
            class="relative z-10 mt-4 inline-flex w-fit items-center gap-1.5 rounded-md bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
          >
            {{ t("bento.featured.cta") }}
            <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </RouterLink>
        </div>

        <!-- Music card -->
        <BentoCard
          label-key="bento.music.label"
          title-key="bento.music.title"
          description-key="bento.music.description"
          icon="music_note"
          bg-class="bg-violet-950"
          accent-class="text-violet-300"
        />

        <!-- Film card -->
        <BentoCard
          label-key="bento.film.label"
          title-key="bento.film.title"
          description-key="bento.film.description"
          icon="movie"
          bg-class="bg-amber-950"
          accent-class="text-amber-300"
        />

        <!-- Series card -->
        <BentoCard
          label-key="bento.series.label"
          title-key="bento.series.title"
          description-key="bento.series.description"
          icon="playlist_play"
          bg-class="bg-emerald-950"
          accent-class="text-emerald-300"
        />

        <!-- Digitized card -->
        <BentoCard
          label-key="bento.digitized.label"
          title-key="bento.digitized.title"
          description-key="bento.digitized.description"
          icon="photo_library"
          bg-class="bg-sky-950"
          accent-class="text-sky-300"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { i18n, type SupportedLang } from "../../i18n";
import { RouteNames } from "../../router/routeNames";
import BentoCard from "./BentoCard.vue";

const { t } = useI18n();
const currentLang = computed(() => i18n.global.locale.value as SupportedLang);
</script>
