<template>
  <section class="border-b border-surface-3 bg-surface-0 py-24">
    <div class="mx-auto max-w-7xl px-6 md:px-12">
      <div class="grid grid-cols-1 gap-16 lg:grid-cols-12">
        
        <div class="lg:col-span-4">
          <h2
            class="mb-6 font-serif text-3xl font-semibold leading-tight tracking-tight text-ink-primary md:text-4xl wrap-break-word hyphens-auto"
          >
            {{ t('production.events.title') }}
          </h2>
          <p class="text-sm leading-relaxed text-ink-secondary">
            {{ t("production.events.body") }}
          </p>
        </div>
        
        <div class="lg:col-span-8">
          <div class="divide-y divide-surface-3 border-t border-surface-3">
            
            <template v-if="loading">
              <div 
                v-for="i in 3" 
                :key="`skeleton-${i}`" 
                class="-mx-4 grid grid-cols-1 gap-y-6 px-4 py-10 md:grid-cols-12 md:items-center md:gap-x-8 animate-pulse"
              >
                <div class="md:col-span-3">
                  <div class="h-7 w-28 bg-surface-2 rounded mb-2"></div>
                  <div class="h-3 w-20 bg-surface-1 rounded"></div>
                </div>
                <div class="md:col-span-6">
                  <div class="h-6 w-48 bg-surface-2 rounded mb-2"></div>
                  <div class="h-4 w-64 bg-surface-1 rounded"></div>
                </div>
                <div class="md:col-span-3 flex md:justify-end">
                  <div class="h-7 w-16 bg-surface-2 rounded"></div>
                </div>
              </div>

              <div class="group -mx-4 flex items-center justify-between px-4 py-8 opacity-40">
                <div class="flex items-center gap-4">
                  <div class="h-3 w-24 bg-surface-2 rounded"></div>
                </div>
                <div class="h-8 w-8 rounded-full border border-surface-3"></div>
              </div>
            </template>

            <template v-else-if="error">
              <div class="py-16 px-6 bg-surface-1/50 border border-dashed border-surface-3 text-center">
                <p class="font-mono text-[10px] uppercase tracking-widest text-ink-primary mb-2">
                  {{ t('production.events.error_title') }}
                </p>
                <p class="text-xs text-ink-tertiary mb-6">
                  {{ t('production.events.error_body') }}
                </p>
                <button 
                  :disabled="loading"
                  class="text-[10px] font-black uppercase tracking-widest border-b border-ink-primary pb-1 hover:text-ink-secondary transition-colors"
                  @click="emit('retry')"
                >
                  {{ t('production.events.retry') }}
                </button>
              </div>
            </template>

            <template v-else>
              <div
                v-for="event in displayedEvents"
                :key="event.id"
                data-test="event-row"
                class="group -mx-4 grid grid-cols-1 gap-y-6 px-4 py-10 transition-colors duration-300 hover:bg-surface-1 md:grid-cols-12 md:items-center md:gap-x-8"
              >
                <div class="md:col-span-3">
                  <div
                    class="font-serif text-2xl font-semibold tracking-tight text-ink-primary leading-none mb-2"
                  >
                    {{ formatNumericDate(event.starts_at, currentLang) }}
                  </div>
                  <div class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-secondary flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-surface-3"></span>
                    {{ formatTime(event.starts_at) }}
                    <span v-if="event.ends_at && formatTime(event.ends_at) !== formatTime(event.starts_at)" class="opacity-80" data-test="event-end-time">
                      — {{ formatTime(event.ends_at) }}
                    </span>
                  </div>
                </div>

                <div class="md:col-span-6">
                  <h4 class="text-xl font-bold leading-tight text-ink-primary">
                    {{ tProd(event.hall?.name) }}
                  </h4>
                  <p v-if="event.hall?.address" class="mt-1 text-sm text-ink-secondary leading-relaxed" data-test="event-address">
                    {{ event.hall.address }}
                  </p>
                </div>

                <div class="flex md:col-span-3 md:justify-end">
                  <span
                    class="font-serif text-lg font-medium text-ink-primary tabular-nums tracking-tight text-right"
                  >
                    <template v-if="event.minPrice === null">
                      € &mdash;
                    </template>
                    <div v-else-if="event.minPrice !== event.maxPrice" class="flex flex-col items-end leading-tight">
                      <span>&euro;{{ formatCurrency(event.minPrice) }}</span>
                      <span class="opacity-50">&mdash;</span>
                      <span>&euro;{{ formatCurrency(event.maxPrice) }}</span>
                    </div>
                    <template v-else>
                      &euro;{{ formatCurrency(event.minPrice) }}
                    </template>
                  </span>
                </div>
              </div>

              <div v-if="events.length === 0" class="py-20 text-center">
                <p class="font-mono text-[10px] uppercase tracking-widest text-ink-tertiary max-w-md mx-auto leading-relaxed">
                  {{ t('production.events.none_found') }}
                </p>
              </div>

              <button 
                v-if="events.length > SHOW_LIMIT"
                class="group -mx-4 flex w-[calc(100%+2rem)] items-center justify-between px-4 py-8 transition-colors duration-300 hover:bg-surface-1 outline-none"
                @click="isExpanded = !isExpanded"
              >
                <div class="flex items-center gap-4">
                  <span class="text-[10px] font-black uppercase tracking-[0.3em] text-ink-primary">
                    {{ isExpanded ? t('production.events.show_less') : t('production.events.show_all') }}
                  </span>
                  
                  <span v-if="!isExpanded" class="text-[9px] font-bold text-ink-tertiary">
                    {{ $t('production.events.remaining_more', { count: remainingCount }) }}
                  </span>
                </div>

                <div class="flex h-8 w-8 items-center justify-center rounded-full border border-surface-3 transition-colors group-hover:border-ink-primary">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke-width="2.5" 
                    stroke="currentColor" 
                    class="h-3 w-3 transition-transform duration-500 text-ink-tertiary group-hover:text-ink-primary"
                    :class="{ 'rotate-180': isExpanded }"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </button>
            </template>
          </div>
        </div>

      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { i18n, type SupportedLang } from '@/i18n';
import { formatNumericDate, formatTime } from '@/utils/date';
import { localizeOrEmpty, type LanguageMap } from '@/utils/language-utils';
import type { EnrichedEvent } from '@/composables/useProductionEvents';

const props = defineProps<{
  events: EnrichedEvent[];
  loading: boolean;
  error: Error | null;
}>();

const emit = defineEmits<{ (e: 'retry'): void }>();

const { t } = useI18n();
const currentLang = computed(() => i18n.global.locale.value as SupportedLang);
const tProd = (map: LanguageMap | null | undefined) => localizeOrEmpty(map ?? {}, currentLang.value);

const SHOW_LIMIT = 3; 
const isExpanded = ref(false);

const displayedEvents = computed(() => {
  if (isExpanded.value) return props.events;
  return props.events.slice(0, SHOW_LIMIT);
});

const remainingCount = computed(() => props.events.length - SHOW_LIMIT);

const formatCurrency = (value: number | null) => {
  if (value === null) return '';
  return new Intl.NumberFormat('nl-BE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

</script>