<template>
  <div class="min-h-screen bg-surface-0">
    <AppNavbar :is-dark="isDark" @toggle-dark="isDark = !isDark" />
    <main>
      <div v-if="loading">
        Loading...
      </div>

      <div v-else-if="notFound">
        <NotFound message="Deze productie bestaat niet" />
      </div>

      <div v-else-if="error">
        <div class="text-red-500">
          {{ error }}
        </div>
      </div>

      <template v-else-if="production">
        <HeroSection :production="production" />
        <DetailsSection />
        <EventsSection />
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
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { getProduction } from "@/services/productions";
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared";

import { useDarkMode } from "@/composables/useDarkMode";
import { ApiError } from "@/services/api";

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
  } catch (e: any) {
    if (e instanceof ApiError && e.status === 404) {
      notFound.value = true;
    } else {
      error.value = e.message ?? "Fout bij laden";
    }
  } finally {
    loading.value = false;
  }
});

</script>
