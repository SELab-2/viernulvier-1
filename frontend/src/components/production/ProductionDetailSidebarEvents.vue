<template>
  <div class="border border-surface-3 bg-surface-0">
    <div class="border-b border-surface-3 px-5 py-4">
      <div class="flex items-center gap-3">
        <h3 class="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-primary">
          {{ t("production.events.title") }}
        </h3>
        <span
          v-if="!loading"
          data-test="event-list-count"
          class="text-[10px] font-semibold text-ink-tertiary"
        >
          ({{ events.length }})
        </span>
      </div>
    </div>

    <div class="px-5 pb-0 pt-0">
      <template v-if="loading">
        <div
          v-for="i in 2"
          :key="`ev-skel-${i}`"
          class="animate-pulse border-b border-surface-3 py-5 last:border-b-0"
        >
          <div class="mb-2 h-5 w-24 rounded bg-surface-2"></div>
          <div class="h-3 w-32 rounded bg-surface-1"></div>
        </div>
      </template>

      <template v-else-if="error">
        <div class="pb-4">
          <p class="font-mono text-[10px] uppercase tracking-widest text-ink-primary">
            {{ t("production.events.error_title") }}
          </p>
          <p class="mt-2 text-xs text-ink-tertiary">
            {{ t("production.events.error_body") }}
          </p>
          <button
            type="button"
            class="event-sidebar-retry"
            @click="emit('retry')"
          >
            {{ t("production.events.retry") }}
          </button>
        </div>
      </template>

      <template v-else>
        <ProductionEventRow
          v-for="ev in displayedEvents"
          :key="ev.id"
          :event="ev"
        />

        <p
          v-if="events.length === 0"
          class="pb-4 pt-2 font-mono text-[10px] uppercase leading-relaxed tracking-widest text-ink-tertiary"
        >
          {{ t("production.events.none_found") }}
        </p>

        <button
          v-if="events.length > collapsedLimit"
          type="button"
          data-test="event-sidebar-expand"
          class="event-sidebar-expand-btn group"
          @click="expanded = !expanded"
        >
          <div class="flex flex-col gap-1">
            <span class="text-[10px] font-black uppercase tracking-[0.25em] text-ink-primary">
              {{
                expanded ? t("production.events.show_less") : t("production.events.show_all")
              }}
            </span>
            <span v-if="!expanded" class="text-[9px] font-bold text-ink-tertiary">
              {{
                t("production.events.remaining_more", {
                  count: events.length - collapsedLimit,
                })
              }}
            </span>
          </div>
          <span class="event-sidebar-expand-chevron-wrap">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2.5"
              stroke="currentColor"
              class="event-sidebar-expand-chevron-icon"
              :class="{ 'rotate-180': expanded }"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </span>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import ProductionEventRow from "@/components/production/ProductionEventRow.vue";
import type { EnrichedEvent } from "@/composables/useProductionEvents";

const props = withDefaults(
  defineProps<{
    events: EnrichedEvent[];
    loading: boolean;
    error: Error | null;
    /** How many rows shown before “show all” (default: 3). */
    collapsedLimit?: number;
  }>(),
  { collapsedLimit: 3 },
);

const emit = defineEmits<{ retry: [] }>();

const { t } = useI18n();

const expanded = ref(false);

const displayedEvents = computed(() =>
  expanded.value ? props.events : props.events.slice(0, props.collapsedLimit),
);
</script>

<style scoped>
@reference "@/style.css";

.event-sidebar-retry {
  @apply mt-4 border-b border-ink-primary pb-0.5 text-[10px] font-black uppercase tracking-widest text-ink-primary transition-colors hover:text-ink-secondary;
}

.event-sidebar-expand-btn {
  @apply mt-2 flex w-full cursor-pointer items-center justify-between pb-4 pt-4 text-left;
}

.event-sidebar-expand-chevron-wrap {
  @apply flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-surface-3 transition-colors group-hover:border-ink-primary;
}

.event-sidebar-expand-chevron-icon {
  @apply h-2.5 w-2.5 text-ink-tertiary transition-transform duration-300 group-hover:text-ink-primary;
}
</style>
