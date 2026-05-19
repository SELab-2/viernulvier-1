<template>
  <div
    class="space-y-3"
    :class="borderedTop ? 'border-t border-surface-3 pt-4' : ''"
  >
    <p
      class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-secondary"
    >
      {{ heading }}
    </p>
    <div :ref="(el) => props.rowBinder(el)" class="flex items-start gap-3">
      <div class="flex min-w-0 flex-1 flex-wrap gap-2">
        <button
          v-for="g in visibleTags"
          :key="g.id"
          :ref="(el) => props.pillBinder(g.id, el)"
          type="button"
          class="productions-filter-tag-section__pill"
          :class="pillClass(g.id)"
          :disabled="disabled"
          @click="emit('toggle', g.id)"
        >
          {{ g.label }}
        </button>
      </div>
      <button
        v-if="showExpandToggle"
        :ref="(el) => props.trailingBinder(el)"
        type="button"
        class="productions-filter-tag-section__expand"
        :disabled="disabled"
        :aria-expanded="expanded"
        :aria-label="expandToggleLabel"
        @click="expanded = !expanded"
      >
        {{ expandToggleLabel }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ComponentPublicInstance } from "vue";
import { useI18n } from "vue-i18n";

export type FilterPanelTag = { id: number; label: string };

export type ProductionsFilterPanelTagVariant = "genre" | "accent";

const props = withDefaults(
  defineProps<{
    heading: string;
    /** Already-sliced visible list (parent runs `useFittingPills`). */
    visibleTags: readonly FilterPanelTag[];
    selectedTagIds: readonly number[];
    showExpandToggle: boolean;
    /** Pass-through ref binders from the row that hosts `useFittingPills`. */
    rowBinder: (el: Element | ComponentPublicInstance | null) => void;
    pillBinder: (id: number, el: Element | ComponentPublicInstance | null) => void;
    trailingBinder: (el: Element | ComponentPublicInstance | null) => void;
    variant?: ProductionsFilterPanelTagVariant;
    disabled?: boolean;
    borderedTop?: boolean;
  }>(),
  {
    variant: "accent",
    disabled: false,
    borderedTop: false,
  },
);

const emit = defineEmits<{ (e: "toggle", id: number): void }>();

const expanded = defineModel<boolean>("expanded", { default: false });

const { t } = useI18n();

const expandToggleLabel = computed(() =>
  expanded.value
    ? t("productionsPage.viewLessTagFilters")
    : t("productionsPage.viewMoreTagFilters"),
);

function pillSelectedClass(): string {
  return props.variant === "genre"
    ? "border-tag-genre-bg bg-tag-genre-bg text-tag-genre-text"
    : "border-accent-outline bg-surface-1 text-ink-primary";
}

function pillClass(id: number): string {
  const idle =
    "border-surface-3 bg-surface-1 text-ink-primary hover:bg-surface-2";
  const selected = pillSelectedClass();
  return props.selectedTagIds.includes(id) ? selected : idle;
}
</script>

<style scoped>
@reference "@/style.css";

.productions-filter-tag-section__pill {
  @apply cursor-pointer rounded-sm border px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-100;
}

.productions-filter-tag-section__expand {
  @apply inline-flex shrink-0 cursor-pointer justify-end self-start whitespace-nowrap pt-0.5 text-right text-sm font-medium leading-snug text-accent-outline underline decoration-from-font underline-offset-2 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-100;
  min-width: 6rem;
}
</style>
