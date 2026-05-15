<template>
  <div
    data-test="event-row"
    class="border-b border-surface-3 py-5 last:border-b-0"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span class="inline-flex items-center gap-2">
            <EventCalendarIcon class="size-[0.9rem] shrink-0 text-ink-tertiary" />
            <span
              class="font-serif text-xl font-semibold leading-tight tracking-tight text-ink-primary"
            >
              {{ formatNumericDate(event.starts_at, currentLang) }}
            </span>
          </span>
          <span class="event-row-timeslot">
            <span class="text-ink-tertiary/70 tracking-[0.14em]" aria-hidden="true">·</span>
            <span
              class="inline-flex items-baseline gap-x-1 tabular-nums tracking-normal"
            >
              <span>{{ formatTime(event.starts_at) }}</span>
              <template
                v-if="event.ends_at && formatTime(event.ends_at) !== formatTime(event.starts_at)"
              >
                <span class="opacity-80" data-test="event-end-time">&mdash;</span>
                <span>{{ formatTime(event.ends_at) }}</span>
              </template>
            </span>
          </span>
        </div>
        <div
          v-if="tProd(event.hall?.name) && event.hall?.address"
          class="event-row-hall-grid"
        >
          <div class="row-span-2 flex flex-col items-start gap-1 self-stretch pt-0.5">
            <MapPinOutlineIcon class="event-row-pin" />
            <div class="event-row-connector-corner" aria-hidden="true" />
          </div>
          <h4
            class="event-row-hall-title col-start-2 row-start-1 flex items-start"
          >
            {{ tProd(event.hall?.name) }}
          </h4>
          <p
            class="event-row-address-text col-start-2 row-start-2"
            data-test="event-address"
          >
            {{ event.hall.address }}
          </p>
        </div>
        <h4
          v-else-if="tProd(event.hall?.name)"
          class="event-row-hall-title mt-3 flex items-start gap-2"
        >
          <MapPinOutlineIcon class="event-row-pin mt-0.5" />
          <span>{{ tProd(event.hall?.name) }}</span>
        </h4>
        <div v-else-if="event.hall?.address" class="mt-3 flex items-start gap-2">
          <MapPinOutlineIcon class="event-row-pin mt-0.5" />
          <p class="event-row-address-text" data-test="event-address">
            {{ event.hall.address }}
          </p>
        </div>
      </div>
      <div
        v-if="event.minPrice !== null"
        class="shrink-0 pt-0.5 text-right"
      >
        <span
          class="font-serif text-sm font-medium tabular-nums tracking-tight text-ink-primary"
        >
          <div
            v-if="event.minPrice !== event.maxPrice"
            class="flex flex-col items-end gap-0 leading-tight"
          >
            <span>&euro;{{ formatCurrency(event.minPrice) }}</span>
            <span class="opacity-50">&mdash;</span>
            <span>&euro;{{ formatCurrency(event.maxPrice) }}</span>
          </div>
          <template v-else>&euro;{{ formatCurrency(event.minPrice) }}</template>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { i18n, type SupportedLang } from "@/i18n";
import { formatNumericDate, formatTime } from "@/utils/date";
import { localizeOrEmpty, type LanguageMap } from "@/utils/language-utils";
import EventCalendarIcon from "@/components/icons/EventCalendarIcon.vue";
import MapPinOutlineIcon from "@/components/icons/MapPinOutlineIcon.vue";
import type { EnrichedEvent } from "@/composables/useProductionEvents";

defineProps<{
  event: EnrichedEvent;
}>();

const currentLang = computed(() => i18n.global.locale.value as SupportedLang);
const tProd = (map: LanguageMap | null | undefined) =>
  localizeOrEmpty(map ?? {}, currentLang.value);

function formatCurrency(value: number | null) {
  if (value === null) return "";
  return new Intl.NumberFormat("nl-BE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
</script>

<style scoped>
@reference "@/style.css";

.event-row-timeslot {
  @apply inline-flex items-baseline gap-x-1 font-mono text-[13px] font-medium uppercase leading-none text-ink-secondary;
}

.event-row-hall-grid {
  @apply mt-3 grid grid-cols-[0.9rem_minmax(0,1fr)] grid-rows-[auto_auto] gap-x-2 gap-y-1 items-start;
}

.event-row-hall-title {
  @apply font-serif text-base font-semibold leading-snug tracking-tight text-ink-primary;
}

.event-row-address-text {
  @apply font-serif text-sm leading-relaxed text-ink-secondary;
}

.event-row-pin {
  @apply size-[0.9rem] shrink-0 translate-y-px text-ink-tertiary;
}

.event-row-connector-corner {
  @apply ml-[0.42rem] h-[18px] w-[0.75rem] translate-y-px rounded-bl-lg border-b border-l border-ink-tertiary/30;
}
</style>
