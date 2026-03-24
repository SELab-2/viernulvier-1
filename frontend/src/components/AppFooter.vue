<template>
  <footer
    class="border-t border-zinc-200 bg-white px-6 py-8 dark:border-zinc-800 dark:bg-zinc-950"
  >
    <div
      class="mx-auto flex max-w-6xl flex-col items-center gap-4 sm:flex-row sm:justify-between"
    >
      <p class="text-sm text-zinc-500">
        {{ t("footer.copyright", { year: currentYear }) }}
      </p>

      <nav class="flex items-center gap-6">
        <a href="#" class="footer-link">{{ t("footer.privacy") }}</a>
        <a href="#" class="footer-link">{{ t("footer.terms") }}</a>
        <a href="#" class="footer-link">{{ t("footer.contact") }}</a>
      </nav>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const currentYear = new Date().getFullYear();
</script>

<style scoped>
@reference "tailwindcss";

.footer-link {
  @apply text-sm text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100;
}
</style>
