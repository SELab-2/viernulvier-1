<template>
  <div class="flex flex-col min-h-screen bg-surface-0">
    <AppNavbar :is-dark="isDark" @toggle-dark="isDark = !isDark" />

    <main class="grow flex flex-col">
      <NotFound
        :title="t('errors.notFound.title')"
        :description="t('errors.notFound.description')"
        :button-label="t('errors.notFound.buttonLabel')"
      />
    </main>

    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import AppNavbar from "@/components/AppNavbar.vue";
import AppFooter from "@/components/AppFooter.vue";
import NotFound from "@/components/NotFound.vue";

import { useI18n } from "vue-i18n";
import { useDarkMode } from "@/composables/useDarkMode";

const { t } = useI18n();
const { isDark } = useDarkMode();
</script>
