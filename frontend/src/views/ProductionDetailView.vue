<template>
  <div class="flex flex-col min-h-screen bg-surface-0">
    <AppNavbar :is-dark="isDark" @toggle-dark="isDark = !isDark" />
    
    <main class="grow flex flex-col">
      
      <div v-if="loading" class="grow flex items-center justify-center font-black uppercase tracking-widest opacity-50">
        Loading...
      </div>

      <div v-else-if="notFound" class="grow flex flex-col">
        <NotFound />
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
        />
        <DetailsSection 
          :production="production" 
          :tag-groups="tagGroups" 
          :total-tags="totalTags" 
        />
        <EventsSection :events="events" />
        <GallerySection />
        <BlogSection />
      </template>
    </main>

    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import AppNavbar from "@/components/AppNavbar.vue";
import AppFooter from "@/components/AppFooter.vue";
import HeroSection from "@/components/production/HeroSection.vue";
import DetailsSection from "@/components/production/DetailsSection.vue";
import EventsSection from "@/components/production/EventsSection.vue";
import GallerySection from "@/components/production/GallerySection.vue";
import BlogSection from "@/components/production/BlogSection.vue";
import NotFound from "@/components/NotFound.vue";
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { getProduction } from "@/services/productions";
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared";

import { useDarkMode } from "@/composables/useDarkMode";
import { ApiError } from "@/services/api";
import { useTagGroups } from "@/composables/useTagGroups";
import { useProductionEvents } from "@/composables/useProductionEvents";

const { isDark } = useDarkMode();

const route = useRoute();
const id = Number(route.params.id);

const production = ref<ProductionWithBackwardsRefs | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const notFound = ref(false);

onMounted(async () => {
  try {
    production.value = await getProduction(id);
  } catch (e: unknown) {
    if (e instanceof ApiError && e.status === 404) {
      notFound.value = true;
    } else if (e instanceof Error) {
      error.value = e.message;
    } else {
      error.value = "Error loading production";
    }
  } finally {
    loading.value = false;
  }
});

const { tagGroups, totalTags } = useTagGroups(id);
const { events } = useProductionEvents(id);

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

</script>
