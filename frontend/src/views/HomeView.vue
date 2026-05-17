<template>
  <div class="flex min-h-screen flex-col bg-surface-0">
    <AppNavbar :is-dark="isDark" @toggle-dark="toggleDark" />
    <main class="flex-1">
      <HeroSection />
      <FeaturedBlogSection />
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { useDarkMode } from "@/composables/useDarkMode";
import AppNavbar from "@/components/nav/AppNavbar.vue";
import AppFooter from "@/components/AppFooter.vue";
import HeroSection from "@/components/home/HeroSection.vue";
import FeaturedBlogSection from "@/components/home/FeaturedBlogSection.vue";

const { isDark, toggleDark } = useDarkMode();
</script>
