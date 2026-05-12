<template>
  <section v-if="productions.length" class="relative left-[50%] right-[50%] ml-[-50vw] mr-[-50vw] w-screen border-y border-surface-3 bg-surface-0 py-24">
    <div class="mx-auto max-w-7xl px-6 md:px-12">
      
      <div class="mb-12 flex items-center gap-4">
        <span class="text-[10px] font-black uppercase tracking-[0.4em] text-ink-tertiary">
          In Focus
        </span>
        <div class="h-px flex-1 bg-surface-3"></div>
      </div>

      <div class="hide-scrollbar flex w-full snap-x snap-mandatory gap-8 overflow-x-auto pb-4">
        <div 
          v-for="prod in productions" 
          :key="prod.id"
          class="group w-[85vw] flex-none snap-start md:w-[350px]"
        >
          <RouterLink :to="{ name: RouteNames.PRODUCTION_DETAIL, params: { id: prod.id, lang: currentLang } }">
            
            <div class="mb-6 aspect-video overflow-hidden bg-surface-2">
              <img
                :alt="localizeOrEmpty(prod.title, currentLang)"
                class="h-full w-full object-cover grayscale transition-transform duration-700 group-hover:scale-105 group-hover:grayscale-0"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCm-IV4I29eomSGLY4WPdxEyXqZeyFa8eQPus8fFLlpWpPNqFWykEaxZ8mCN2osbnDmxdBjCVc5PxCUZVb55mBD9LBRQYmF6S4sCDcLd2RgsEJXVh1juUvJX9rpUgkWIIYON5QIJtGE3HwurGDQC_c6hQogKZpm_1psN5p7Uo2zPQu9M1I3EjOxio2J0iOaCqZt7UfkCSXZYwRsNcnZqvaddt9ZIpd2uFgmAGgnrYT6nm_OwyKdHSsq2V8TE7uldF4abQK2bepI5GbV" 
              />
            </div>

            <span class="text-[10px] font-black uppercase tracking-widest text-ink-tertiary">
              Productie — DATE
            </span>

            <h3 class="mt-2 font-serif text-2xl font-semibold leading-snug tracking-tight text-ink-primary decoration-2 group-hover:underline">
              {{ localizeOrEmpty(prod.title, currentLang) }}
            </h3>

            <p v-if="prod.teaser" class="mt-4 line-clamp-3 text-sm leading-relaxed text-ink-secondary">
              {{ localizeOrEmpty(prod.teaser, currentLang) }}
            </p>
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared";
import { localizeOrEmpty } from "@/utils/language-utils";
import { i18n, type SupportedLang } from "@/i18n";
import { RouteNames } from "@/router/routeNames";

const props = defineProps<{
  productions: ProductionWithBackwardsRefs[]
}>();

const currentLang = computed(() => i18n.global.locale.value as SupportedLang);

</script>

<style scoped>
@reference "@/style.css";

.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>