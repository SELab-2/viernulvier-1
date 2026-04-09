<template>
  <div class="min-h-screen bg-surface-0">
    <AppNavbar :is-dark="isDark" @toggle-dark="toggleDark" />
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
import { useDarkMode } from "@/composables/useDarkMode";
import AppNavbar from "@/components/AppNavbar.vue";
import AppFooter from "@/components/AppFooter.vue";
import HeroSection from "@/components/home/HeroSection.vue";
import StatsSection from "@/components/home/StatsSection.vue";
import BentoGrid from "@/components/home/BentoGrid.vue";
import MarkdownEditor from "@/components/MarkdownEditor.vue";
import { ref } from "vue";

const { isDark, toggleDark } = useDarkMode();
const previewContent = ref("");
</script>
