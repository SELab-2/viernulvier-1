<template>
  <section class="bg-zinc-950 px-6 py-20 lg:px-10 lg:py-28">
    <div
      class="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2"
    >
      <!-- Text -->
      <div class="flex flex-col gap-6">
        <h1
          class="text-5xl font-black italic uppercase leading-none tracking-tight text-white lg:text-6xl xl:text-7xl"
        >
          {{ t("hero.title") }}
        </h1>
        <p class="max-w-md text-base leading-relaxed text-zinc-400">
          {{ t("hero.subtitle") }}
        </p>
        <div class="flex items-center gap-4">
          <RouterLink
            :to="{
              name: RouteNames.PRODUCTIONS,
              params: { lang: currentLang },
            }"
            class="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
          >
            {{ t("hero.cta") }}
            <span class="material-symbols-outlined text-base"
              >arrow_forward</span
            >
          </RouterLink>
        </div>
      </div>

      <!-- Image card -->
      <div
        class="relative overflow-hidden rounded-2xl bg-zinc-800 aspect-[4/3]"
      >
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/De_Vooruit_Gent.jpg/1280px-De_Vooruit_Gent.jpg"
          alt="De Vooruit"
          class="h-full w-full object-cover opacity-70"
        />
        <div
          class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-950/90 to-transparent p-6"
        >
          <p
            class="text-xs font-semibold uppercase tracking-widest text-zinc-400"
          >
            Gent, België
          </p>
          <p class="mt-1 text-lg font-bold text-white">
            De Vooruit / VierNulVier
          </p>
        </div>
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

const { t } = useI18n();
const currentLang = computed(() => i18n.global.locale.value as SupportedLang);
</script>
