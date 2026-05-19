<!-- eslint-disable vue/no-v-html -- description is rendered from parseAndSanitizeContent, which sanitizes HTML through DOMPurify. -->
<template>
  <RouterLink 
    :to="{ name: RouteNames.PRODUCTION_DETAIL, params: { id: production.id, lang: currentLang } }"
    class="group block w-full"
  >
    <div class="relative mb-6 aspect-video overflow-hidden bg-surface-2">
      <img
        v-if="thumbnailUrl"
        :src="thumbnailUrl"
        :alt="localizeOrEmpty(production.title, currentLang)"
        class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div v-else class="h-full w-full bg-surface-2"></div>
    </div>

    <div class="flex items-center justify-between gap-2">
      <span class="text-[10px] font-black uppercase tracking-widest text-ink-primary">
        {{ artistName }}
      </span>
      <span v-if="dateRange" class="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary">
        {{ dateRange }}
      </span>
    </div>

    <h3 class="mt-2 font-serif text-2xl font-semibold leading-snug tracking-tight text-ink-primary decoration-1 underline-offset-4 group-hover:underline">
      {{ localizeOrEmpty(production.title, currentLang) }}
    </h3>

    <div 
      v-if="production.description" 
      class="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-secondary prose-flat"
      v-html="description"
    ></div>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared";
import { localizeOrEmpty } from "@/utils/language-utils";
import { i18n, type SupportedLang } from "@/i18n";
import { RouteNames } from "@/router/routeNames";
import { parseAndSanitizeContent } from '@/utils/parsers';

const props = defineProps<{
  production: ProductionWithBackwardsRefs;
  thumbnailUrl?: string | null;
  dateRange?: string;
}>();

const currentLang = computed(() => i18n.global.locale.value as SupportedLang);

const artistName = computed(() => 
  localizeOrEmpty(props.production.artist || {}, currentLang.value),
);

const description = computed(() => parseAndSanitizeContent(localizeOrEmpty(props.production.description, currentLang.value)));

</script>

<style scoped>
@reference "@/style.css";

.prose-flat :deep(p) {
  display: inline;
  margin: 0;
}
</style>
