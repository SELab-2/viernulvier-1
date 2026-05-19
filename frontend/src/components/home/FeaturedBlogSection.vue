<!-- eslint-disable vue/no-v-html -- excerpt is rendered from parseFirstParagraphMd, which sanitizes markdown HTML through DOMPurify. -->
<template>
  <section class="bg-surface-1 px-6 py-20 lg:px-10 lg:py-24">
    <div class="mx-auto max-w-3xl">
      <div
        class="mb-8 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-ink-secondary"
      >
        <span
          class="h-px w-8 bg-ink-tertiary opacity-50"
          aria-hidden="true"
        />
        <span class="whitespace-nowrap">{{ t("featuredBlog.eyebrow") }}</span>
        <span
          class="h-px w-8 bg-ink-tertiary opacity-50"
          aria-hidden="true"
        />
      </div>

      <!-- Skeleton while loading -->
      <div v-if="loading" role="status" :aria-label="t('featuredBlog.loading')" aria-live="polite">
        <div class="border border-surface-3 bg-surface-0 px-6 py-10 md:px-12 md:py-12">
          <div class="mb-5 h-2 w-32 animate-pulse rounded-sm bg-surface-3" />
          <div class="space-y-2.5">
            <div class="h-8 w-full animate-pulse rounded-sm bg-surface-3 md:h-10" />
            <div class="h-8 w-4/5 animate-pulse rounded-sm bg-surface-3 md:h-10" />
          </div>
          <div class="mt-8 space-y-2">
            <div class="h-4 w-full animate-pulse rounded-sm bg-surface-3" />
            <div class="h-4 w-full animate-pulse rounded-sm bg-surface-3" />
            <div class="h-4 w-full animate-pulse rounded-sm bg-surface-3" />
            <div class="h-4 w-3/5 animate-pulse rounded-sm bg-surface-3" />
          </div>
          <div class="mt-10 h-3 w-24 animate-pulse rounded-sm bg-surface-3" />
        </div>
      </div>

      <!-- Error or post not found: section disappears silently -->
      <template v-else-if="error || !post" />

      <!-- Editorial card -->
      <article
        v-else
        class="border border-surface-3 bg-surface-0 px-6 py-10 md:px-12 md:py-12"
      >
        <!-- Dateline -->
        <p
          class="mb-5 text-xs uppercase tracking-[0.2em] text-ink-tertiary"
        >
          {{ datelineText }}
        </p>

        <!-- Title -->
        <h2
          class="font-serif text-3xl font-semibold leading-[1.1] tracking-tight text-ink-primary md:text-4xl"
        >
          <RouterLink
            :to="{
              name: RouteNames.BLOG_POST_DETAIL,
              params: { lang: currentLang, id: post.id },
            }"
            class="hover:underline decoration-1 decoration-ink-tertiary underline-offset-[6px] transition hover:decoration-ink-primary"
          >
            {{ title }}
          </RouterLink>
        </h2>

        <!-- Lead image: only rendered when the markdown content contains one -->
        <figure v-if="leadImageUrl" class="mt-8">
          <img
            :src="leadImageUrl"
            :alt="leadImageAlt"
            class="block w-full"
            loading="lazy"
            decoding="async"
          />
          <figcaption
            v-if="leadImageAlt"
            class="mt-3 font-serif text-sm italic leading-snug text-ink-secondary"
          >
            {{ leadImageAlt }}
          </figcaption>
        </figure>

        <!-- Excerpt with drop-cap -->
        <div
          class="article-lead mt-8 font-serif text-base leading-[1.7] text-ink-primary md:text-lg text-justify hyphens-auto"
          v-html="excerpt"
        />

        <!-- Read-more link -->
        <RouterLink
          :to="{
            name: RouteNames.BLOG_POST_DETAIL,
            params: { lang: currentLang, id: post.id },
          }"
          class="mt-10 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-ink-primary underline decoration-1 underline-offset-[6px] transition hover:decoration-2"
        >
          <span>{{ t("featuredBlog.readMore") }}</span>
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
        </RouterLink>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { i18n, type SupportedLang } from "@/i18n";
import { RouteNames } from "@/router/routeNames";
import type { BlogPostWithBackwardsRefs } from "@viernulvier/shared";
import { localizeOrEmpty, localizeWithFallback } from "@/utils/language-utils";
import { formatDate } from "@/utils/date";
import { getBlogPosts } from "@/services/blogposts";
import { extractFirstMdImage, parseFirstParagraphMd } from "@/utils/parsers";

const { t, locale } = useI18n();

const currentLang = computed(
  () => i18n.global.locale.value as SupportedLang,
);

const post = ref<BlogPostWithBackwardsRefs | null>(null);
const loading = ref(true);
const error = ref(false);

onMounted(async () => {
  try {
    const posts = await getBlogPosts();
    const sorted = [...posts].sort((a, b) => {
      const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
      const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
      return dateB - dateA;
    });
    post.value = sorted[0] ?? null;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
});

const rawContent = computed(() =>
  localizeWithFallback(post.value?.content, (map) => localizeOrEmpty(map, currentLang.value)),
);

const title = computed(() =>
  localizeWithFallback(post.value?.title, (map) => localizeOrEmpty(map, currentLang.value)),
);

const leadImage = computed(() => extractFirstMdImage(rawContent.value));

const leadImageUrl = computed(() => leadImage.value?.src ?? null);

const leadImageAlt = computed(() => leadImage.value?.alt ?? "");

const excerpt = computed(() => parseFirstParagraphMd(rawContent.value));

const datelineText = computed(() => {
  if (!post.value?.published_at) {
    return t("featuredBlog.dateline", { date: "" });
  }
  return t("featuredBlog.dateline", {
    date: formatDate(post.value.published_at, locale.value),
  });
});
</script>

<style scoped>
@reference "@/style.css";

/*
 * Drop cap on the excerpt — same recipe as ProductionDetail's
 * DetailsSection so the editorial vocabulary stays consistent.
 * Targets the <p> rendered by v-html via :deep().
 */
.article-lead :deep(p) {
  margin: 0;
}

.article-lead {
  overflow: hidden;
}

.article-lead :deep(p)::first-letter {
  font-family: var(--font-serif);
  font-weight: 700;
  color: var(--ink-primary);
  margin-right: 0.4rem;
  -webkit-initial-letter: 3;
  initial-letter: 3;
}

@supports not ((initial-letter: 3) or (-webkit-initial-letter: 3)) {
  .article-lead :deep(p)::first-letter {
    float: left;
    font-size: 4.8em;
    line-height: 1;
    margin: 0.05em 0.5rem 0 0;
  }
}
</style>
