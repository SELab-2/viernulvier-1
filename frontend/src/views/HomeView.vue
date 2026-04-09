<template>
  <div class="min-h-screen bg-surface-0">
    <AppNavbar :is-dark="isDark" @toggle-dark="isDark = !isDark" />
    <main>
      <HeroSection />
      <StatsSection />
      <BentoGrid />
      <!-- TODO: remove before merge — reviewer preview of MarkdownEditor -->
      <section style="padding: 2rem; max-width: 800px; margin: 0 auto;">
        <h2 style="margin-bottom: 1rem;">MarkdownEditor preview</h2>
        <MarkdownEditor v-model="previewContent" placeholder="Type some markdown here…" />
      </section>
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from "vue";
import AppNavbar from "@/components/AppNavbar.vue";
import AppFooter from "@/components/AppFooter.vue";
import HeroSection from "@/components/home/HeroSection.vue";
import StatsSection from "@/components/home/StatsSection.vue";
import BentoGrid from "@/components/home/BentoGrid.vue";
import MarkdownEditor from "@/components/MarkdownEditor.vue";

function getInitialDark(): boolean {
  const stored = localStorage.getItem("viernulvier-dark");
  if (stored !== null) return stored === "true";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

const isDark = ref(getInitialDark());
const previewContent = ref("");

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
