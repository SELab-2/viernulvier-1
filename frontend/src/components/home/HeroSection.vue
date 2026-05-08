<template>
  <section class="bg-surface-inv-raised px-6 py-20 lg:px-10 lg:py-28">
    <div
      class="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2"
    >
      <!-- Text -->
      <div class="flex flex-col gap-6">
        <h1
          class="text-5xl font-black italic uppercase leading-none tracking-tight text-ink-on-inv lg:text-6xl xl:text-7xl"
        >
          {{ t("hero.title") }}
        </h1>
        <p class="max-w-md text-base leading-relaxed text-ink-on-inv-secondary">
          {{ t("hero.subtitle") }}
        </p>
        <div class="flex items-center gap-4">
          <RouterLink
            :to="{
              name: RouteNames.PRODUCTIONS,
              params: { lang: currentLang },
            }"
            class="inline-flex items-center gap-2 rounded-md bg-ink-on-inv px-5 py-3 text-sm font-semibold text-surface-inv transition hover:bg-ink-on-inv-secondary"
          >
            {{ t("hero.cta") }}
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          </RouterLink>
        </div>
      </div>

      <!-- Image card -->
      <div
        class="relative overflow-hidden rounded-2xl bg-surface-inv-raised aspect-4/3"
      >
        <img
          src="@/assets/images/hero.webp"
          alt="De Vooruit"
          width="1200"
          height="900"
          class="hero-photo h-full w-full object-cover"
        />
        <div class="hero-overlay absolute inset-0" />
        <div class="absolute bottom-0 left-0 right-0 p-6">
          <p
            class="text-xs font-semibold uppercase tracking-widest text-ink-on-inv-tertiary"
          >
            Gent, België
          </p>
          <p class="mt-1 text-lg font-bold text-ink-on-inv">
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
import { i18n, type SupportedLang } from "@/i18n";
import { RouteNames } from "@/router/routeNames";

const { t } = useI18n();
const currentLang = computed(
  () => i18n.global.locale.value as SupportedLang,
);

</script>

<style scoped>
.hero-photo {
  opacity: calc(1 - var(--photo-opacity));
}

.hero-overlay {
  background: linear-gradient(to top, var(--photo-overlay) 0%, transparent 60%);
  opacity: var(--photo-opacity);
}
</style>
