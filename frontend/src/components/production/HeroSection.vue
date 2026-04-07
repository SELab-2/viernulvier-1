<template>
  <section class="relative flex min-h-175 w-full items-end overflow-hidden">
    <div class="absolute inset-0 z-0">
      <img
        alt="Contemporary dance performance"
        class="h-full w-full object-cover grayscale contrast-125"
        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDU21ewyTmp0aPBEaU9xMGtqD-vLtugWzQIgeF5cNgkw3uvYnZCH2696RoNKJ-kPMsE9zWgEZnutEMH-J-JJfxTKGmKYwRmPRlTakVaNy15qZ9KQXigCvuBMADoZpkjjd9YYLpjteDwWRYyjupc87R0EJsRbW2MzKJN0p2HzFbO65oUEoM7xAE0CfFOdMkaUI45I3xa5PPVHFIdzJkm4Mtz8Y1xX_3ALsoeMsj0C_QTlHCfJnFU0vs_2s95CJhFPdbRZSLDLIPgysph"
        referrerPolicy="no-referrer"
      />
      <div class="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent"></div>
    </div>
    
    <div class="relative z-10 mx-auto flex w-full max-w-7xl flex-col justify-between gap-12 px-6 pb-20 md:flex-row md:items-end md:px-12">
      <div ref="heroContent" class="opacity-0 animate-fade-up max-w-4xl">
        <div class="mb-4 flex flex-col gap-2">
          <span class="text-sm font-bold uppercase tracking-[0.3em] text-ink-on-inv opacity-70">
            {{ supertitle }}
          </span>
          <span class="italic text-3xl font-bold tracking-tighter text-ink-on-inv md:text-4xl">
            {{ artist }}
          </span>
        </div>
        
        <div class="space-y-4">
          <h1 class="text-[clamp(2.5rem,8vw,8rem)] font-black uppercase leading-[0.9] tracking-tighter text-ink-on-inv wrap-break-word">
            {{ title }}
          </h1>
          <p class="italic text-xl font-light leading-tight text-ink-on-inv opacity-90 md:text-2xl">
            Een woordeloos onderzoek naar mens en technologie
          </p>
        </div>
      </div>

      <div ref="statsContent" class="opacity-0 animate-fade-in flex flex-col gap-6 text-ink-on-inv md:items-end">
        <div class="flex flex-col gap-1 items-start md:items-end">
  
          <span class="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
            {{ t("production.hero.dateRange") }}
          </span>
  
          <div class="flex flex-col items-start md:items-end text-xl font-bold tracking-tight leading-tight">
            <span>25 Oct 2024</span>
            <span>—</span>
            <span>2 Jan 2025</span>
          </div>

        </div>
        
        <div class="flex flex-col gap-1 md:items-end">
          <span class="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
            {{ t("production.hero.runningTime") }}
          </span>
          <span class="text-xl font-bold tracking-tight">75m</span>
        </div>
        
        <div class="flex flex-wrap gap-3 pt-4 md:justify-end">
          <template v-if="genreTags.length > 0">
            <span 
              v-for="tag in genreTags" 
              :key="tag"
              class="border border-surface-0 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-ink-on-inv"
            >
              {{ tag }}
            </span>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { i18n, type SupportedLang } from "@/i18n";
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared";
import { computed } from "vue";
import { localizeOrEmpty, type LanguageMap } from "@/utils/i18n";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const currentLang = computed(
  () => i18n.global.locale.value as SupportedLang,
);

const props = defineProps<{
  production: ProductionWithBackwardsRefs;
  tagGroups: { label: string; tags: string[] }[];
}>();

const genreTags = computed(() => {
  const genreGroup = props.tagGroups.find(group => {
    return group.label.toLowerCase().includes('genre'); 
  });
  
  return genreGroup ? genreGroup.tags : [];
});

const tProd = (map: LanguageMap | null | undefined) =>
  localizeOrEmpty(map ?? {}, currentLang.value);

const artist = computed(() => tProd(props.production.artist));
const title = computed(() => tProd(props.production.title));
const supertitle = computed(() => tProd(props.production.supertitle)); //nullable
const tagline = computed(() => tProd(props.production.tagline));

</script>
