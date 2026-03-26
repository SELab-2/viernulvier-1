<template>
  <div class="min-h-screen bg-surface-0 font-[Inter,sans-serif]">
    <AppNavbar :is-dark="isDark" @toggle-dark="isDark = !isDark" />
    <main>
      <HeroSection />
      <StatsSection />
      <BentoGrid />
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from "vue";
import AppNavbar from "../components/AppNavbar.vue";
import AppFooter from "../components/AppFooter.vue";
import HeroSection from "../components/home/HeroSection.vue";
import StatsSection from "../components/home/StatsSection.vue";
import BentoGrid from "../components/home/BentoGrid.vue";

function getInitialDark(): boolean {
  const stored = localStorage.getItem("viernulvier-dark");
  if (stored !== null) return stored === "true";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

const isDark = ref(getInitialDark());

watchEffect(() => {
  const htmlEl = document.documentElement;
  if (isDark.value) {
    htmlEl.classList.add("dark");
  } else {
    htmlEl.classList.remove("dark");
  }
  localStorage.setItem("viernulvier-dark", String(isDark.value));
});
</script>
