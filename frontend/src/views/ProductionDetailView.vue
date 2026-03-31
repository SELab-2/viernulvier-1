<template>
  <div class="min-h-screen bg-surface-0">
    <AppNavbar :is-dark="isDark" @toggle-dark="isDark = !isDark" />
    <main>
      <HeroSection />
      <DetailsSection />
      <EventsSection />
      <GallerySection />
      <BlogSection />
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
// import { ref, onMounted } from "vue";
// import { useRoute } from "vue-router";
// import { getProduction } from "@/services/productions";
// import type { ProductionWithBackwardsRefs } from "@viernulvier/shared";

import { useDarkMode } from "@/composables/useDarkMode";

const { isDark } = useDarkMode();

// const route = useRoute();
// const id = Number(route.params.id);

// const production = ref<ProductionWithBackwardsRefs | null>(null);
// const loading = ref(true);
// const error = ref<string | null>(null);

// // data ophalen wanneer page laadt
// onMounted(async () => {
//   try {
//     production.value = await getProduction(id);
//   } catch (e) {
//     error.value = e instanceof Error ? e.message : "Fout bij laden";
//   } finally {
//     loading.value = false;
//   }
// });
</script>