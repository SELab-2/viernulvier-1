<template>
  <div class="cms-modal-overlay" @click.self="$emit('close')">
    <section class="cms-modal cms-remove-modal" role="dialog" aria-modal="true">
      <header class="cms-modal-header">
        <h2 class="text-xl font-bold text-ink-primary">
          {{ t(titleKey) }}
        </h2>
        <button type="button" class="cms-side-close" @click="$emit('close')">
          {{ t("cms.panel.close") }}
        </button>
      </header>

      <div class="cms-modal-body">
        <p class="text-sm text-ink-secondary">
          {{ t(bodyKey, { count }) }}
        </p>
        <p v-if="error" class="text-sm text-red-700">
          {{ error }}
        </p>
      </div>

      <footer class="cms-modal-footer">
        <button
          type="button"
          class="cms-side-close"
          :disabled="isLoading"
          @click="$emit('close')"
        >
          {{ t("cms.actions.confirmRemoveCancel") }}
        </button>
        <button
          type="button"
          class="cms-side-save"
          :disabled="isLoading"
          @click="$emit('confirm')"
        >
          {{ isLoading ? t("cms.panel.saving") : t("cms.actions.confirmRemoveSubmit") }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

defineProps<{
  isLoading: boolean;
  error: string | null;
  count: number;
  titleKey: string;
  bodyKey: string;
}>();

defineEmits<{
  (e: "close"): void;
  (e: "confirm"): void;
}>();

const { t } = useI18n();
</script>
