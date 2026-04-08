<template>
  <section class="border-b border-surface-3 bg-surface-0 py-24">
    <div class="mx-auto max-w-7xl px-6 md:px-12">
      <div class="grid grid-cols-1 gap-16 lg:grid-cols-12">
        <div class="lg:col-span-4">
          <h2 
            class="mb-6 text-4xl font-black uppercase leading-[0.9] tracking-tighter text-ink-primary wrap-break-word hyphens-auto "
            v-html="t('production.events.title')"
          ></h2>
          <p class="text-sm leading-relaxed text-ink-secondary">
            {{ t("production.events.body") }}
          </p>
        </div>
        
        <div class="lg:col-span-8">
          <div class="divide-y divide-surface-3 border-t border-surface-3">
            <div
              v-for="event in events"
              :key="event.id"
              class="group -mx-4 grid grid-cols-1 gap-y-6 px-4 py-10 transition-colors duration-300 hover:bg-surface-1 md:grid-cols-12 md:items-center md:gap-x-8"
            >
              <div class="md:col-span-3">
                <div class="text-2xl font-black tracking-tighter text-ink-primary leading-none mb-2">
                  {{ formatNumericDate(event.starts_at, currentLang) }}
                </div>
                <div class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-secondary flex items-center gap-2">
                  <span class="w-1.5 h-1.5 rounded-full bg-surface-3"></span>
                  {{ formatTime(event.starts_at) }}
  
                  <span 
                    v-if="event.ends_at && formatTime(event.ends_at) !== formatTime(event.starts_at)" 
                    class="opacity-80"
                  >
                    — {{ formatTime(event.ends_at) }}
                  </span>
                </div>
              </div>

              <div class="md:col-span-6">
                <h4 class="text-xl font-bold leading-tight text-ink-primary">
                  {{ tProd(event.hall?.name) || 'Unnamed Venue' }}
                </h4>
                <p v-if="event.hall?.address" class="mt-1 text-sm text-ink-secondary leading-relaxed">
                  {{ event.hall.address }}
                </p>
              </div>

              <div class="flex md:col-span-3 md:justify-end">
                <span class="font-mono text-xl font-black text-ink-primary tabular-nums tracking-tight">
                  € {{ event.displayPrice ?? '—' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { EnrichedEvent } from '@/composables/useProductionEvents';
import { i18n, type SupportedLang } from '@/i18n';
import { formatNumericDate, formatTime } from '@/utils/date';
import { localizeOrEmpty, type LanguageMap } from '@/utils/i18n';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  events: EnrichedEvent[];
}>();

const { t } = useI18n();
const currentLang = computed(
  () => i18n.global.locale.value as SupportedLang,
);

const tProd = (map: LanguageMap | null | undefined) =>
  localizeOrEmpty(map ?? {}, currentLang.value);


</script>