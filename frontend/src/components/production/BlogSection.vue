<!-- eslint-disable vue/no-v-html -- previews are rendered from parseAndSanitizeMd, which sanitizes markdown HTML through DOMPurify. -->
<template>
  <section v-if="loading || blogPosts.length > 0" class="border-y border-surface-3 bg-surface-1 py-24">
    <div class="mx-auto max-w-7xl px-6 md:px-12">
      <div class="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 class="font-serif text-3xl font-semibold leading-tight tracking-tight text-ink-primary md:text-4xl">
            {{ t("production.blog.title") }}
          </h2>
          <p class="mt-2 text-sm leading-relaxed text-ink-secondary">
            {{ t("production.blog.body") }}
          </p>
        </div>
      </div>

      <div v-if="loading" class="grid grid-cols-1 gap-12 md:grid-cols-3" role="status" aria-busy="true">
        <div v-for="i in 3" :key="i" class="animate-pulse">
          <div class="mb-4 h-3 w-24 bg-surface-3"></div>
          <div class="mb-2 h-7 w-full bg-surface-3"></div>
          <div class="mb-6 h-7 w-2/3 bg-surface-3"></div>
          <div class="space-y-2">
            <div class="h-4 w-full bg-surface-2"></div>
            <div class="h-4 w-full bg-surface-2"></div>
            <div class="h-4 w-4/5 bg-surface-2"></div>
          </div>
        </div>
      </div>

      <div v-else class="grid grid-cols-1 gap-12 md:grid-cols-3">
        <RouterLink 
          v-for="post in blogPosts" 
          :key="post.id"
          :to="{ name: RouteNames.BLOG_POST_DETAIL, params: { id: post.id, lang: currentLang } }"
          class="group block"
        >
          <span class="text-[10px] font-black uppercase tracking-[0.3em] text-ink-tertiary">
            {{ formatShortDate(post.published_at ?? "", currentLang) }}
          </span>
          
          <h3 class="mt-3 font-serif text-2xl font-black italic uppercase leading-[1.05] text-ink-primary decoration-1 underline-offset-4 group-hover:underline">
            {{ localizeWithFallback(post.title, (map) => localizeOrEmpty(map ?? {}, currentLang)) }}
          </h3>
          
          <div 
            class="mt-4 line-clamp-3 text-sm leading-relaxed text-ink-secondary prose-flat"
            v-html="getPreview(post.content)"
          ></div>
          
          <div class="mt-6 flex items-center gap-2 border-b border-ink-primary pb-1 w-fit">
            <span class="text-[10px] font-bold uppercase tracking-widest text-ink-primary">
              {{ t("production.blog.readMore") }}
            </span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </div>
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import type { BlogPostWithBackwardsRefs } from "@viernulvier/shared";
import { i18n, type SupportedLang } from "@/i18n";
import { localizeOrEmpty, localizeWithFallback, type LanguageMap } from "@/utils/language-utils";
import { RouteNames } from "@/router/routeNames";
import { parseAndSanitizeMd } from "@/utils/parsers";
import { formatShortDate } from "@/utils/date";

defineProps<{
  blogPosts: BlogPostWithBackwardsRefs[];
  loading: boolean;
}>();

const { t } = useI18n();
const currentLang = computed(() => i18n.global.locale.value as SupportedLang);

function getPreview(content: LanguageMap) {
  const rawText = localizeWithFallback(content, (map) => localizeOrEmpty(map ?? {}, currentLang.value));
  return parseAndSanitizeMd(rawText);
}
</script>

<style scoped>
.prose-flat :deep(p) {
  display: inline;
  margin: 0;
}
</style>
