<template>
  <div class="flex flex-col min-h-screen bg-surface-0">
    <AppNavbar :is-dark="isDark" @toggle-dark="isDark = !isDark" />
    
    <main class="grow flex flex-col">

      <div class="grow flex flex-col">
        <NotFound />
      </div>

    </main>

    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import AppNavbar from "@/components/AppNavbar.vue";
import AppFooter from "@/components/AppFooter.vue";
import NotFound from "@/components/NotFound.vue";

import { useDarkMode } from "@/composables/useDarkMode";

const { isDark } = useDarkMode();

</script>