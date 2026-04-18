<template>
  <div class="cms-tab-content cms-tab-placeholder">
    <p class="text-sm text-ink-secondary">
      {{ t("cms.tabs.tagsPlaceholder") }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>
