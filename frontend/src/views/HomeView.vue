<template>
  <div class="flex min-h-screen flex-col bg-surface-0">
    <AppNavbar :is-dark="isDark" @toggle-dark="toggleDark" />
    <main class="flex-1">
      <HeroSection />
      <StatsSection />
      <BentoGrid />
      <!-- TODO: remove before merge — reviewer preview of MarkdownEditor -->
      <section style="padding: 2rem; max-width: 800px; margin: 0 auto;">
        <h2 class="mb-4 text-2xl font-bold text-ink-primary">MarkdownEditor preview</h2>
        <MarkdownEditor v-model="previewContent" placeholder="Type some markdown here…" />
      </section>
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { useDarkMode } from "@/composables/useDarkMode";
import AppNavbar from "@/components/nav/AppNavbar.vue";
import AppFooter from "@/components/AppFooter.vue";
import HeroSection from "@/components/home/HeroSection.vue";
import StatsSection from "@/components/home/StatsSection.vue";
import BentoGrid from "@/components/home/BentoGrid.vue";
import MarkdownEditor from "@/components/MarkdownEditor.vue";
import { ref } from "vue";

const { isDark, toggleDark } = useDarkMode();
const previewContent = ref("");
</script>
