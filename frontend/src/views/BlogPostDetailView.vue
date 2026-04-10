<template>
  <div class="min-h-screen bg-surface-0">
    <AppNavbar :is-dark="isDark" @toggle-dark="toggleDark" />

    <main class="mx-auto max-w-3xl px-6 py-12">
      <!-- Loading state -->
      <div v-if="loading" class="post-loading" role="status" aria-live="polite">
        <p class="text-ink-secondary">{{ t("blogpost.loading") }}</p>
      </div>

      <!-- Not found state -->
      <div v-else-if="error === 'not-found'" class="post-error" role="alert">
        <h1 class="mb-3 text-2xl font-bold text-ink-primary">
          {{ t("blogpost.notFound") }}
        </h1>
        <p class="mb-6 text-ink-secondary">{{ t("blogpost.notFoundDescription") }}</p>
        <RouterLink
          :to="{ name: RouteNames.HOME, params: { lang: currentLang } }"
          class="back-link"
        >
          {{ t("blogpost.backToHome") }}
        </RouterLink>
      </div>

      <!-- Generic error state -->
      <div v-else-if="error === 'generic'" class="post-error" role="alert">
        <p class="mb-6 text-ink-secondary">{{ t("blogpost.errorGeneric") }}</p>
        <RouterLink
          :to="{ name: RouteNames.HOME, params: { lang: currentLang } }"
          class="back-link"
        >
          {{ t("blogpost.backToHome") }}
        </RouterLink>
      </div>

      <!-- Happy path -->
      <article v-else-if="post" class="post">
        <header class="mb-8">
          <h1 class="mb-3 text-4xl font-bold text-ink-primary">{{ post.title }}</h1>
          <p v-if="formattedPublishedAt" class="text-sm text-ink-tertiary">
            {{ t("blogpost.publishedOn", { date: formattedPublishedAt }) }}
          </p>
        </header>

        <div class="post-body">{{ bodyText }}</div>
      </article>
    </main>

    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { useDarkMode } from "@/composables/useDarkMode";
import { i18n, type SupportedLang } from "@/i18n";
import { RouteNames } from "@/router/routeNames";
import { getBlogPost } from "@/services/blogposts";
import { ApiError } from "@/services/api";
import AppNavbar from "@/components/AppNavbar.vue";
import AppFooter from "@/components/AppFooter.vue";
import type { BlogPost } from "@viernulvier/shared";

const props = defineProps<{ id: string }>();

const { t } = useI18n();
const { isDark, toggleDark } = useDarkMode();

const currentLang = computed(() => i18n.global.locale.value as SupportedLang);

const post = ref<BlogPost | null>(null);
const loading = ref<boolean>(true);
const error = ref<"not-found" | "generic" | null>(null);

/**
 * Safely extracts the `body` string from the blogpost's content field.
 * `content` is typed as a generic record on the backend, so we defensively
 * check that `body` is actually a string before displaying it.
 */
const bodyText = computed<string>(() => {
  const body = post.value?.content?.["body"];
  return typeof body === "string" ? body : "";
});

/**
 * Formats `published_at` using the current locale. Returns an empty string
 * for unpublished posts (which shouldn't reach this component via the public
 * endpoint, but we handle it gracefully anyway).
 */
const formattedPublishedAt = computed<string>(() => {
  const publishedAt = post.value?.published_at;
  if (!publishedAt) return "";
  return new Date(publishedAt).toLocaleDateString(currentLang.value, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
});

async function loadPost() {
  loading.value = true;
  error.value = null;
  post.value = null;

  const numericId = Number(props.id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    error.value = "not-found";
    loading.value = false;
    return;
  }

  try {
    post.value = await getBlogPost(numericId);
  } catch (err) {
    if (err instanceof ApiError && err.isNotFound) {
      error.value = "not-found";
    } else {
      error.value = "generic";
    }
  } finally {
    loading.value = false;
  }
}

onMounted(loadPost);
watch(() => props.id, loadPost);
</script>

<style scoped>
@reference "@/style.css";

.post-loading,
.post-error {
  @apply py-16 text-center;
}

.back-link {
  @apply inline-block rounded-lg bg-accent-dark px-5 py-2.5 text-sm font-semibold text-surface-0 transition hover:bg-accent-dark-hover;
}

.post-body {
  @apply text-base leading-relaxed text-ink-primary;
  white-space: pre-wrap;
}
</style>
