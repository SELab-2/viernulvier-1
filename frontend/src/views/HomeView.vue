<template>
  <div class="min-h-screen bg-surface-0">
    <AppNavbar :is-dark="isDark" @toggle-dark="toggleDark" />
    <main>
      <HeroSection />
      <StatsSection />
      <BentoGrid />
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { useDarkMode } from "@/composables/useDarkMode";
import AppNavbar from "@/components/AppNavbar.vue";
import AppFooter from "@/components/AppFooter.vue";
import HeroSection from "@/components/home/HeroSection.vue";
import StatsSection from "@/components/home/StatsSection.vue";
import BentoGrid from "@/components/home/BentoGrid.vue";

const { isDark, toggleDark } = useDarkMode();
</script>
