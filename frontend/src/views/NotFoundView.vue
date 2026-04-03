<template>
  <div class="min-h-screen bg-surface-0">
    <AppNavbar :is-dark="isDark" @toggle-dark="isDark = !isDark" />
    <main>
      <div>
        <NotFound />
      </div>
    </main>

    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import NotFound from "@/components/NotFound.vue";
import AppNavbar from "@/components/AppNavbar.vue";
import AppFooter from "@/components/AppFooter.vue";
import { useDarkMode } from "@/composables/useDarkMode";
const { isDark } = useDarkMode();
</script>