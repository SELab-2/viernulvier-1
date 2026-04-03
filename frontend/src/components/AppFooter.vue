<template>
  <footer class="border-t border-surface-3 bg-surface-1 px-6 py-8">
    <div
      class="mx-auto flex max-w-6xl flex-col items-center gap-4 sm:flex-row sm:justify-between"
    >
      <p class="text-sm text-ink-tertiary">
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
@reference "../style.css";

.footer-link {
  @apply text-sm text-ink-tertiary transition hover:text-ink-primary;
}
</style>
