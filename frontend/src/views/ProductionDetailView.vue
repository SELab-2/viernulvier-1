<template>
  <div class="flex flex-col min-h-screen bg-surface-0">
    <AppNavbar :is-dark="isDark" @toggle-dark="isDark = !isDark" />
    
    <main class="grow flex flex-col">
      
      <div v-if="loading" class="grow flex items-center justify-center font-black uppercase tracking-widest opacity-50">
        Loading...
      </div>

      <div v-else-if="notFound" class="grow flex flex-col">
        <NotFound
          :kicker="t('production.notFound.kicker')"
          :title="t('production.notFound.title')"
          :description="t('production.notFound.description')"
          :button-label="t('production.notFound.buttonLabel')"
          :help-title="t('production.notFound.helpTitle')"
          :help-text="t('production.notFound.helpText')"
          :contact-label="t('production.notFound.contactLabel')"
        />
      </div>

      <div v-else-if="error" class="grow flex items-center justify-center">
        <div class="text-red-500 font-bold border border-red-500 p-8">
          {{ error }}
        </div>
      </div>

      <template v-else-if="production">
        <HeroSection
          :production="production"
          :tag-groups="tagGroups"
          :event-stats="eventStats"
          :banner-url="heroBannerUrl"
        />
        <DetailsSection 
          v-if="showDetailsSection"
          :production="production" 
          :tag-groups="tagGroups" 
          :total-tags="totalTags"
          :performance-events="events"
          :events-loading="eventsLoading"
          :events-error="eventsError"
          @retry-events="eventsRetry"
        />
        <GallerySection :slides="gallerySlides" />
        <BlogSection :blog-posts="blogPosts" :loading="blogLoading" />
      </template>
    </main>

    <AppFooter v-if="!loading" />
  </div>
</template>

<script setup lang="ts">
import AppNavbar from "@/components/nav/AppNavbar.vue";
import AppFooter from "@/components/AppFooter.vue";
import HeroSection from "@/components/production/HeroSection.vue";
import DetailsSection from "@/components/production/DetailsSection.vue";
import GallerySection from "@/components/production/GallerySection.vue";
import BlogSection from "@/components/production/BlogSection.vue";
import NotFound from "@/components/NotFound.vue";
import { ref, onMounted, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import type { ImageWithCrops } from "@/services/media";
import { getImagesForProductionOrEmpty } from "@/services/media";
import { getProduction } from "@/services/productions";
import type { BlogPostWithBackwardsRefs, ProductionWithBackwardsRefs } from "@viernulvier/shared";
import {
  pickHighQualityImageCropUrl,
  pickProductionDetailBannerUrl,
} from "@/utils/productionThumbnails";
import { i18n, type SupportedLang } from "@/i18n";

import { useDarkMode } from "@/composables/useDarkMode";
import { ApiError } from "@/services/api";
import { useTagGroups } from "@/composables/useTagGroups";
import { useProductionEvents } from "@/composables/useProductionEvents";
import { localizeOrEmpty, type LanguageMap } from "@/utils/language-utils";
import { getBlogPost } from "@/services/blogposts";

const { t } = useI18n();
const { isDark } = useDarkMode();

const route = useRoute();
const id = Number(route.params.id);

const production = ref<ProductionWithBackwardsRefs | null>(null);
const productionImages = ref<ImageWithCrops[]>([]);
const blogPosts = ref<BlogPostWithBackwardsRefs[]>([]);
const blogLoading = ref(false);
const loading = ref(true);
const error = ref<string | null>(null);
const notFound = ref(false);

onMounted(async () => {
  try {
    const [fetched, images] = await Promise.all([
      getProduction(id),
      getImagesForProductionOrEmpty(id),
    ]);
    production.value = fetched;
    productionImages.value = images;

    loading.value = false;

    const postIds = (fetched.blogposts || []) as number[];
    if (postIds.length > 0) {
      void loadBlogPosts(postIds);
    }
  } catch (e: unknown) {
    if (e instanceof ApiError && e.status === 404) {
      notFound.value = true;
    } else if (e instanceof Error) {
      error.value = e.message;
    } else {
      error.value = "Error loading production";
    }
    loading.value = false;
  }
});

async function loadBlogPosts(ids: number[]) {
  blogLoading.value = true;
  try {
    const postResults = await Promise.allSettled(ids.map(id => getBlogPost(id)));
    blogPosts.value = postResults
      .filter((r): r is PromiseFulfilledResult<BlogPostWithBackwardsRefs> => r.status === 'fulfilled')
      .map(r => r.value);
  } finally {
    blogLoading.value = false;
  }
}

const { tagGroups, totalTags } = useTagGroups(id);
const { events, loading: eventsLoading, error: eventsError, retry: eventsRetry } = useProductionEvents(id);

const heroBannerUrl = computed(() =>
  pickProductionDetailBannerUrl(productionImages.value),
);

const gallerySlides = computed(() => {
  if (!production.value) return [];
  const lang = i18n.global.locale.value as SupportedLang;
  const title = localizeOrEmpty(production.value.title ?? {}, lang).trim();
  const out: { src: string; alt: string }[] = [];
  for (let i = 0; i < productionImages.value.length; i++) {
    const img = productionImages.value[i]!;
    const src = pickHighQualityImageCropUrl(img);
    if (!src) continue;
    out.push({
      src,
      alt: title ? `${title} (${i + 1})` : `Image ${i + 1}`,
    });
  }
  return out;
});

/**
 * Computed statistics derived from the events list.
 * Calculates date range and the duration of an event shown in the hero.
 */
const eventStats = computed(() => {
  if (!events.value.length) return null;

  const startTimes = events.value.map(e => new Date(e.starts_at).getTime());
  
  const firstDate = new Date(Math.min(...startTimes));
  const lastDate = new Date(Math.max(...startTimes));

  const firstEvent = events.value[0];
  let durationMinutes = null;
  if (firstEvent.starts_at && firstEvent.ends_at) {
    const start = new Date(firstEvent.starts_at);
    const end = new Date(firstEvent.ends_at);
    durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  }

  return {
    firstDate,
    lastDate,
    durationMinutes,
    hasMultipleDays: firstDate.toDateString() !== lastDate.toDateString(),
  };
});

const hasDetails = computed(() => {
  if (!production.value) return false;

  const p = production.value;
  
  const hasText = (field: LanguageMap | null | undefined): boolean => {
    if (!field) return false;
    return Object.values(field).some(val => typeof val === 'string' && val.trim() !== '');
  };

  return (
    hasText(p.teaser) ||
    hasText(p.description) ||
    hasText(p.description_2) ||
    hasText(p.description_extra) ||
    hasText(p.quote) ||
    hasText(p.programme) ||
    hasText(p.info) ||
    (tagGroups.value && tagGroups.value.length > 0)
  );
});

/** Show detail layout when editorial content exists or when sidebar should list performances/loading/error. */
const showDetailsSection = computed(
  () =>
    !!production.value &&
    (hasDetails.value ||
      eventsLoading.value ||
      events.value.length > 0 ||
      eventsError.value !== null),
);</script>
