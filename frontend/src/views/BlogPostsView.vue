<template>
  <div class="flex min-h-screen flex-col bg-surface-0">
    <AppNavbar :is-dark="isDark" @toggle-dark="toggleDark" />

    <main class="flex-1">
      <section class="border-b border-surface-3 bg-surface-1 py-10 md:py-14">
        <div class="mx-auto max-w-6xl px-6 lg:px-10">
          <div class="mx-auto max-w-3xl text-center">
            <h1
              class="font-serif text-3xl font-semibold leading-tight tracking-tight text-ink-primary md:text-4xl"
            >
              {{ t("blogPostsPage.heading") }}
            </h1>
            <p
              class="mx-auto mt-3 max-w-2xl font-serif text-lg italic leading-snug text-ink-secondary md:text-xl"
            >
              {{ t("blogPostsPage.intro") }}
            </p>
          </div>
        </div>
      </section>

      <!-- Post list -->
      <section class="mx-auto max-w-4xl px-6 pb-24 pt-12 lg:px-10">

        <!-- Loading state -->
        <div v-if="loading" class="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
          <div class="flex items-center gap-1">
            <span class="text-[10px] font-black uppercase tracking-[0.3em] text-ink-secondary">
              {{ t("blogPostsPage.loading") }}
            </span>
            <div class="flex gap-1">
              <span class="dot-wave">.</span>
              <span class="dot-wave delay-100">.</span>
              <span class="dot-wave delay-200">.</span>
            </div>
          </div>
        </div>

        <!-- Error state -->
        <div
          v-else-if="error"
          role="alert"
          class="rounded-md border border-surface-3 bg-surface-1 px-6 py-8 text-center"
        >
          <p class="font-serif text-base text-ink-secondary">
            {{ t("blogPostsPage.errorGeneric") }}
          </p>
        </div>

        <!-- Empty state -->
        <div v-else-if="posts.length === 0" class="py-16 text-center">
          <p class="font-serif text-base italic text-ink-tertiary">
            {{ t("blogPostsPage.empty") }}
          </p>
        </div>

        <!-- Post rows -->
        <ul v-else role="list" class="divide-y divide-surface-3">
          <li v-for="post in visiblePosts" :key="post.id">
            <RouterLink
              :to="{ name: RouteNames.BLOG_POST_DETAIL, params: { lang: currentLang, id: post.id } }"
              class="group -mx-3 flex flex-col gap-1 px-3 py-8 transition-colors hover:bg-surface-1/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-highlight"
            >
              <span
                v-if="post.published_at"
                class="text-[10px] font-black uppercase tracking-[0.3em] text-ink-tertiary"
              >
                {{ formatShortDate(post.published_at, currentLang) }}
              </span>

              <h2
                class="mt-1 font-serif text-xl font-semibold leading-snug tracking-tight text-ink-primary md:text-2xl"
              >
                {{ localizeOrEmpty(post.title, currentLang) }}
              </h2>

              <div
                class="prose-flat mt-2 line-clamp-3 text-sm leading-relaxed text-ink-secondary"
                v-html="getPreview(post.content)"
              />

              <div class="mt-4 flex w-fit items-center gap-2 border-b border-ink-primary pb-1">
                <span class="text-[10px] font-bold uppercase tracking-widest text-ink-primary">
                  {{ t("blogPostsPage.readMore") }}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </RouterLink>
          </li>
        </ul>

        <!-- Pagination -->
        <nav
          v-if="totalPages > 1"
          class="mt-10 flex items-center justify-between border-t border-surface-3 pt-8"
          role="group"
          aria-label="Paginering"
        >
          <button
            type="button"
            class="blog-posts-view__pager-btn"
            :disabled="currentPage <= 1"
            @click="goToPage(currentPage - 1)"
          >
            ← {{ t("blogPostsPage.previous") }}
          </button>

          <span class="text-sm tabular-nums text-ink-secondary">
            {{ currentPage }} / {{ totalPages }}
          </span>

          <button
            type="button"
            class="blog-posts-view__pager-btn"
            :disabled="currentPage >= totalPages"
            @click="goToPage(currentPage + 1)"
          >
            {{ t("blogPostsPage.next") }} →
          </button>
        </nav>

      </section>
    </main>

    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink, useRoute, useRouter } from "vue-router";
import type { BlogPostWithBackwardsRefs } from "@viernulvier/shared";

import AppNavbar from "@/components/nav/AppNavbar.vue";
import AppFooter from "@/components/AppFooter.vue";
import { useDarkMode } from "@/composables/useDarkMode";
import { i18n, type SupportedLang } from "@/i18n";
import { RouteNames } from "@/router/routeNames";
import { getBlogPosts } from "@/services/blogposts";
import { localizeOrEmpty, type LanguageMap } from "@/utils/language-utils";
import { parseAndSanitizeMd } from "@/utils/parsers";
import { formatShortDate } from "@/utils/date";

const { t } = useI18n();
const { isDark, toggleDark } = useDarkMode();

const currentLang = computed(() => i18n.global.locale.value as SupportedLang);

const route = useRoute();
const router = useRouter();

const PAGE_SIZE = 6;


const allPosts = ref<BlogPostWithBackwardsRefs[]>([]);
const loading = ref(true);
const error = ref(false);


const posts = computed(() =>
  [...allPosts.value].sort((a, b) => {
    const ta = a.published_at ? new Date(a.published_at).getTime() : 0;
    const tb = b.published_at ? new Date(b.published_at).getTime() : 0;
    return tb - ta;
  }),
);

const currentPage = computed(() => {
  const p = parseInt(route.query.page as string);
  return isNaN(p) || p < 1 ? 1 : p;
});

const totalPages = computed(() => Math.max(1, Math.ceil(posts.value.length / PAGE_SIZE)));

const visiblePosts = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return posts.value.slice(start, start + PAGE_SIZE);
});

function goToPage(page: number) {
  void router.replace({ query: { ...route.query, page: page === 1 ? undefined : String(page) } });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

watch(totalPages, (total) => {
  if (currentPage.value > total) goToPage(total);
});


function getPreview(content: LanguageMap): string {
  const raw = localizeOrEmpty(content, currentLang.value);
  return parseAndSanitizeMd(raw);
}


onMounted(async () => {
  try {
    allPosts.value = await getBlogPosts();
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
@reference "@/style.css";

.prose-flat :deep(p) {
  display: inline;
  margin: 0;
}

.dot-wave {
  @apply text-[10px] font-black text-ink-secondary;
  display: inline-block;
  animation: dot-wave 1.4s infinite ease-in-out;
}

.delay-100 { animation-delay: 0.2s; }
.delay-200 { animation-delay: 0.4s; }

@keyframes dot-wave {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-4px); }
}

.blog-posts-view__pager-btn {
  @apply cursor-pointer rounded-md border border-accent-outline bg-surface-0 px-3 py-1.5 text-sm font-medium text-ink-primary transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40;
}
</style>