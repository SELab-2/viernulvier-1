<template>
  <div
    class="productions-layout-toggle"
    role="group"
    :aria-label="t('productionsPage.layoutToggleLabel')"
  >
    <button
      type="button"
      class="productions-layout-toggle__btn"
      :class="
        modelValue === 'list'
          ? 'productions-layout-toggle__btn--active'
          : ''
      "
      :aria-pressed="modelValue === 'list'"
      :aria-label="t('productionsPage.layoutListLabel')"
      :disabled="disabled"
      @click="select('list')"
    >
      <svg
        class="size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <circle cx="4" cy="6" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="4" cy="12" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="4" cy="18" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    </button>
    <button
      type="button"
      class="productions-layout-toggle__btn"
      :class="
        modelValue === 'grid'
          ? 'productions-layout-toggle__btn--active'
          : ''
      "
      :aria-pressed="modelValue === 'grid'"
      :aria-label="t('productionsPage.layoutGridLabel')"
      :disabled="disabled"
      @click="select('grid')"
    >
      <svg
        class="size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

export type ProductionsLayoutMode = "list" | "grid";

defineProps<{
  modelValue: ProductionsLayoutMode;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: ProductionsLayoutMode): void;
}>();

const { t } = useI18n();

function select(mode: ProductionsLayoutMode) {
  emit("update:modelValue", mode);
}
</script>

<style scoped>
@reference "@/style.css";

.productions-layout-toggle {
  @apply inline-flex shrink-0 overflow-hidden rounded-md border border-surface-3 bg-surface-0 dark:bg-surface-1;
}

.productions-layout-toggle__btn {
  @apply flex h-full min-h-9 w-9 cursor-pointer items-center justify-center bg-transparent text-ink-tertiary transition hover:text-ink-primary disabled:cursor-not-allowed disabled:opacity-50;
}

.productions-layout-toggle__btn + .productions-layout-toggle__btn {
  @apply border-l border-surface-3;
}

.productions-layout-toggle__btn--active {
  @apply bg-ink-primary text-surface-0 dark:bg-ink-primary dark:text-surface-0;
}

.productions-layout-toggle__btn--active:hover {
  @apply text-surface-0;
}
</style>
