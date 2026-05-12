<template>
  <div class="flex min-h-screen flex-col bg-surface-0 transition-colors duration-300">
    <AppNavbar :is-dark="isDark" @toggle-dark="toggleDark" />

    <main class="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
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
      <article v-else-if="post" class="animate-fade-up">

        <header class="mb-16">
          <div v-if="formattedPublishedAt" class="mb-6 text-[10px] font-black uppercase tracking-[0.3em] text-ink-tertiary">
            {{ formattedPublishedAt }}
          </div>
          
          <h1 class="font-serif text-5xl font-black italic uppercase leading-[1.05] text-ink-primary lg:text-7xl">
            {{ title }}
          </h1>
        </header>

        <div class="prose prose-base lg:prose-lg max-w-none text-ink-primary mb-24" v-html="bodyHtml"></div>

        <LinkedProductionsCarousel 
          :productions="linkedProductions" 
          :thumbnails="thumbnailUrlByProductionId"
          :date-ranges="dateRangeByProductionId" 
        />

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
import AppNavbar from "@/components/nav/AppNavbar.vue";
import AppFooter from "@/components/AppFooter.vue";
import type { BlogPostWithBackwardsRefs, ProductionWithBackwardsRefs } from "@viernulvier/shared";
import { localizeOrEmpty } from "@/utils/language-utils";
import { parseAndSanitizeMd } from "@/utils/parsers";
import { getProduction } from "@/services/productions";
import LinkedProductionsCarousel from "@/components/blogpost/LinkedProductionsCarousel.vue";
import { getImagesForProductionOrEmpty } from "@/services/media";
import { pickProductionListThumbnailUrl } from "@/utils/productionThumbnails";
import { getEvents } from "@/services/events";

const props = defineProps<{ id: string }>();
const { t } = useI18n();
const { isDark, toggleDark } = useDarkMode();

const currentLang = computed(() => i18n.global.locale.value as SupportedLang);
const post = ref<BlogPostWithBackwardsRefs | null>(null);
const loading = ref<boolean>(true);
const error = ref<"not-found" | "generic" | null>(null);

const title = computed(() => localizeOrEmpty(post.value?.title ?? {}, currentLang.value));
const bodyHtml = computed(() => {
  const rawMarkdown = localizeOrEmpty(post.value?.content ?? {}, currentLang.value);
  return parseAndSanitizeMd(rawMarkdown);
});

const formattedPublishedAt = computed(() => {
  const publishedAt = post.value?.published_at;
  if (!publishedAt) return "";
  return new Date(publishedAt).toLocaleDateString(currentLang.value, { year: "numeric", month: "long", day: "numeric" });
});

const linkedProductions = ref<ProductionWithBackwardsRefs[]>([]);
const thumbnailUrlByProductionId = ref(new Map<number, string | null>());
const dateRangeByProductionId = ref(new Map<number, string>());

async function loadPost() {
  loading.value = true;
  try {
    const data = await getBlogPost(Number(props.id));
    post.value = data;

    const ids = (data.productions || []) as number[];
    if (ids.length === 0) return;

    const results = await Promise.allSettled(ids.map(id => getProduction(id)));
    
    linkedProductions.value = results
      .filter((r): r is PromiseFulfilledResult<ProductionWithBackwardsRefs> => r.status === 'fulfilled')
      .map(r => r.value);

    await Promise.all(linkedProductions.value.map(async (prod) => {
      const [images, eventsResult] = await Promise.allSettled([
        getImagesForProductionOrEmpty(prod.id),
        getEvents(prod.id),
      ]);

      if (images.status === 'fulfilled') {
        thumbnailUrlByProductionId.value.set(prod.id, pickProductionListThumbnailUrl(images.value));
      }

      if (eventsResult.status === 'fulfilled') {
        dateRangeByProductionId.value.set(prod.id, formatYearRange(eventsResult.value));
      } else {
        dateRangeByProductionId.value.set(prod.id, "");
      }
    }));

  } catch (err) {
    error.value = (err instanceof ApiError && err.status === 404) ? "not-found" : "generic";
  } finally {
    loading.value = false;
  }
}

function formatYearRange(events: { starts_at: string | Date }[]): string {
  if (!events.length) return "";

  const years = events.map(e => 
    typeof e.starts_at === 'string' 
      ? new Date(e.starts_at).getFullYear() 
      : e.starts_at.getFullYear(),
  );

  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);

  return minYear === maxYear ? String(minYear) : `${minYear}-${maxYear}`;
}

onMounted(loadPost);
watch(() => props.id, loadPost);
</script>
