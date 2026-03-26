<template>
  <div :class="['min-h-screen bg-surface-0 font-[Inter,sans-serif]', isDark ? 'dark' : '']">
    <AppNavbar :is-dark="isDark" @toggle-dark="isDark = !isDark" />
    <main>
      <HeroSection />
      <StatsSection />
      <BentoGrid />
      <NewsletterSection />
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import AppNavbar from "../components/AppNavbar.vue";
import AppFooter from "../components/AppFooter.vue";
import HeroSection from "../components/home/HeroSection.vue";
import StatsSection from "../components/home/StatsSection.vue";
import BentoGrid from "../components/home/BentoGrid.vue";
import NewsletterSection from "../components/home/NewsletterSection.vue";

const isDark = ref(false);
</script>
