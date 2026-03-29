<template>
  <section class="bg-surface-1 px-6 py-16 lg:px-10">
    <div class="mx-auto max-w-6xl">
      <RouterLink
        :to="{
          name: RouteNames.PRODUCTIONS,
          params: { lang: currentLang },
        }"
        class="group relative flex flex-col justify-end overflow-hidden rounded-2xl bg-surface-inv p-8 min-h-72 lg:min-h-80 transition"
      >
        <img
          src="../../assets/images/bento.webp"
          alt=""
          width="1200"
          height="800"
          class="featured-photo absolute inset-0 h-full w-full object-cover"
        />
        <div class="featured-overlay absolute inset-0" />
        <span
          class="relative z-10 mb-3 w-fit rounded-full bg-ink-on-inv/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-ink-on-inv-secondary"
        >
          {{ t("bento.featured.label") }}
        </span>
        <h2 class="relative z-10 text-2xl font-bold text-ink-on-inv">
          {{ t("bento.featured.title") }}
        </h2>
        <p class="relative z-10 mt-2 max-w-lg text-sm leading-relaxed text-ink-on-inv-secondary">
          {{ t("bento.featured.description") }}
        </p>
        <span
          class="relative z-10 mt-4 inline-flex w-fit items-center gap-1.5 rounded-md bg-ink-on-inv px-4 py-2 text-sm font-semibold text-surface-inv transition group-hover:bg-ink-on-inv-secondary"
        >
          {{ t("bento.featured.cta") }}
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
        </span>
      </RouterLink>
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
const currentLang = computed(() => i18n.global.locale.value as SupportedLang);
</script>

<style scoped>
.featured-photo {
  opacity: calc(1 - var(--photo-opacity));
}

.featured-overlay {
  background: linear-gradient(to top, var(--photo-overlay) 0%, transparent 60%);
  opacity: var(--photo-opacity);
}
</style>
