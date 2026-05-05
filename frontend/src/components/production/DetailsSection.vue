<template>
  <div class="bg-surface-1 text-ink-primary">
    <div class="mx-auto max-w-7xl px-6 py-24 md:px-12">
      <section class="flex flex-col gap-16 lg:grid lg:grid-cols-12 lg:gap-x-16 lg:gap-y-24">
        
        <div v-if="hasSidebarContent" class="lg:col-start-9 lg:col-span-4">
          <div class="sticky top-32 h-fit space-y-6">
            
            <div v-if="teaser || description_extra" class="bg-surface-inv p-8 text-ink-on-inv border border-surface-3">
              <div v-if="teaser" class="text-[10px] font-black uppercase tracking-[0.3em] text-ink-on-inv-tertiary" :class="{ 'mb-4': description_extra }" v-html="teaser" />
              
              <div v-if="teaser && description_extra" class="mb-6 h-px w-12 bg-ink-on-inv-tertiary opacity-30"></div>
              
              <div v-if="description_extra" class="text-sm leading-relaxed whitespace-pre-line" v-html="description_extra" />
            </div>
              
            <div v-if="tagGroups && tagGroups.length > 0" class="border border-surface-3 bg-surface-0 transition-all duration-300">
              <button 
                class="group flex w-full items-center justify-between px-6 py-6 outline-none transition-colors hover:bg-surface-1"
                @click="tagsExpanded = !tagsExpanded"
              >
                <div class="flex items-center gap-3">
                  <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-ink-primary">
                    {{ t("production.details.tags") }}
                  </h3>
                  <span class="text-[9px] font-bold text-ink-tertiary">
                    ({{ totalTags }})
                  </span>
                </div>

                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke-width="2.5" 
                  stroke="currentColor" 
                  class="h-3 w-3 transition-all duration-300 text-ink-tertiary group-hover:text-ink-primary"
                  :class="{ 'rotate-180': tagsExpanded, 'translate-y-0.5': !tagsExpanded }"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              <div v-if="tagsExpanded" class="space-y-6 border-t border-surface-3 p-6 pt-5 bg-surface-0">
                <template v-for="group in tagGroups" :key="group.label">
                  <div v-if="group.tags.length > 0" class="flex flex-col gap-2">
                    <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-tertiary">
                      {{ group.label }}
                    </span>
                    <div class="flex flex-wrap gap-2">
                      <span 
                        v-for="tag in group.tags" 
                        :key="tag" 
                        class="border border-surface-3 bg-surface-1 px-2.5 py-1 text-[9px] font-bold uppercase text-ink-secondary hover:border-ink-tertiary transition-colors cursor-default"
                      >
                        {{ tag }}
                      </span>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <div :class="['space-y-16 lg:row-start-1', mainContentClass]">
          
          <div v-if="quote" class="space-y-8 pb-12 border-b border-surface-3">
            <figure class="relative">
              <!--
                Hanging open-quote glyph in the margin — newspaper feature
                article convention. Decorative, so hidden from screen readers
                (the actual quote text already includes its punctuation).
              -->
              <span
                aria-hidden="true"
                class="pointer-events-none absolute -left-2 -top-6 select-none font-serif text-7xl leading-none text-ink-tertiary opacity-50 md:-left-8 md:-top-10 md:text-8xl"
              >
                &ldquo;
              </span>
              <blockquote class="space-y-4">
                <p
                  class="font-serif italic text-2xl font-medium leading-[1.2] tracking-tight text-ink-primary md:text-4xl"
                >
                  {{ quote }}
                </p>
                <figcaption
                  v-if="quote_source"
                  class="pl-8 text-xs font-semibold uppercase tracking-[0.2em] text-ink-secondary md:pl-16"
                >
                  &mdash; {{ quote_source }}
                </figcaption>
              </blockquote>
            </figure>
          </div>
          
          <div v-if="description || description_2" class="space-y-10">
            <div
              v-if="description"
              class="font-serif text-lg font-normal leading-[1.7] text-ink-primary md:text-xl whitespace-pre-line"
              v-html="description"
            />
            <div
              v-if="description_2"
              class="font-serif text-base font-normal leading-[1.7] text-ink-secondary whitespace-pre-line"
              v-html="description_2"
            />
          </div>
        </div>

        <div v-if="info || programme" class="border-t border-surface-3 pt-12 lg:col-span-12">
          <div class="grid grid-cols-1 gap-12 lg:grid-cols-12">

            <div v-if="info" class="lg:col-span-8 space-y-6">
              <h3 class="text-xs font-black uppercase tracking-[0.2em] text-ink-primary">
                {{ t("production.details.extraInfo") }}
              </h3>
              <div class="max-w-2xl text-sm italic text-ink-secondary leading-relaxed whitespace-pre-line" v-html="info" />
            </div>

            <div 
              v-if="programme" 
              :class="[
                'h-fit border border-surface-3 bg-surface-0 p-6 shadow-sm',
                info ? 'lg:col-span-4 lg:col-start-9 sticky top-32' : 'lg:col-span-5 lg:col-start-1'
              ]"
            >
              <div class="text-xs font-medium leading-relaxed text-ink-primary whitespace-pre-line" v-html="programme" />
            </div>

          </div>
        </div>

      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { i18n, type SupportedLang } from "@/i18n";
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared";
import { computed, ref } from "vue";
import { localizeOrEmpty, type LanguageMap } from "@/utils/language-utils";
import { useI18n } from "vue-i18n";
import { normalizeQuote, parseAndSanitizeContent } from "@/utils/parsers";

const { t } = useI18n();
const currentLang = computed(
  () => i18n.global.locale.value as SupportedLang,
);

const props = defineProps<{
  production: ProductionWithBackwardsRefs;
  tagGroups: { label: string; tags: string[] }[];
  totalTags: number;
}>();

const tProd = (map: LanguageMap | null | undefined) =>
  localizeOrEmpty(map ?? {}, currentLang.value);

function parseField(map: LanguageMap | null | undefined): string {
  const value = tProd(map);
  return parseAndSanitizeContent(value);
}

const teaser = computed(() => parseField(props.production.teaser));
const description = computed(() => parseField(props.production.description));
const description_extra = computed(() => parseField(props.production.description_extra));
const description_2 = computed(() => parseField(props.production.description_2));
const quote = computed(() => normalizeQuote(parseField(props.production.quote)));
const quote_source = computed(() => parseField(props.production.quote_source));
const programme = computed(() => parseField(props.production.programme));
const info = computed(() => parseField(props.production.info));

const tagsExpanded = ref(true);

const hasSidebarContent = computed(() => {
  const hasTags = props.tagGroups && props.tagGroups.length > 0;
  const hasTeaserText = !!teaser.value;
  const hasExtraText = !!description_extra.value;
  
  return hasTags || hasTeaserText || hasExtraText;
});

const mainContentClass = computed(() => {
  return hasSidebarContent.value 
    ? "lg:col-start-1 lg:col-span-8"
    : "lg:col-span-12";
});
</script>

<style scoped>
:deep(a) {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
  transition: opacity 0.2s;
}

:deep(a:hover) {
  text-decoration-thickness: 2px;
}
</style>
