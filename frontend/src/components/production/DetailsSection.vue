<!-- eslint-disable vue/no-v-html -- v-html strings come from parseAndSanitizeContent (DOMPurify). Quote lines use normalizePlainText + text interpolation. -->
<template>
  <div class="bg-surface-1 text-ink-primary">
    <div class="mx-auto max-w-7xl px-6 py-24 md:px-12">
      <section class="flex flex-col gap-16 lg:grid lg:grid-cols-12 lg:gap-x-16 lg:gap-y-24">

        <!-- Sidebar: performances (event rows), teaser/extra, then tags. -->
        <aside v-if="hasSidebarContent" class="lg:col-start-8 lg:col-span-5">
          <div class="sticky top-32 h-fit space-y-8">
            <ProductionDetailSidebarEvents
              v-if="showPerformanceBlock"
              :events="performanceEvents"
              :loading="eventsLoading"
              :error="eventsError"
              @retry="emit('retryEvents')"
            />

            <div
              v-if="teaser || description_extra"
              class="border-l-2 border-ink-tertiary pl-5 md:pl-6"
            >
              <div
                v-if="teaser"
                class="detail-rich-text font-serif text-base italic leading-relaxed text-ink-primary md:text-lg"
                v-html="teaser"
              />
              <div
                v-if="description_extra"
                class="detail-rich-text font-serif text-sm leading-relaxed text-ink-secondary"
                :class="{ 'mt-3': teaser }"
                v-html="description_extra"
              />
            </div>

            <div
              v-if="tagGroups && tagGroups.length > 0"
              class="border border-surface-3 bg-surface-0 transition-all duration-300"
            >
              <button
                class="group flex w-full items-center justify-between px-6 py-5 outline-none transition-colors hover:bg-surface-1"
                @click="tagsExpanded = !tagsExpanded"
              >
                <div class="flex items-center gap-3">
                  <h3
                    class="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-primary"
                  >
                    {{ t("production.details.tags") }}
                  </h3>
                  <span class="text-[10px] font-semibold text-ink-tertiary">
                    ({{ totalTags }})
                  </span>
                </div>

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
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
                    <span
                      class="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-secondary"
                    >
                      {{ group.label }}
                    </span>
                    <div class="flex flex-wrap gap-2">
                      <a
                        v-for="tag in group.tags"
                        :key="tag.tagId"
                        :href="`/${currentLang}/productions?tags=${tag.tagId}`"
                        style="text-decoration: none"
                        class="border border-ink-tertiary/60 bg-surface-1 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-primary hover:border-ink-primary transition-colors"
                      >
                        {{ tag.label }}
                      </a>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </aside>

        <!-- Main column — long-form article body. -->
        <div :class="['space-y-12 lg:row-start-1', mainContentClass]">

          <!-- Lead paragraph — drop cap on first letter, justified -->
          <div
            v-if="description"
            class="article-lead detail-rich-text font-serif text-lg leading-[1.7] text-ink-primary md:text-xl text-justify hyphens-auto"
            v-html="description"
          />

          <!-- Pull quote — sits between the two paragraphs as a break -->
          <div v-if="quote" class="my-4 py-4">
            <figure class="relative">
              <span
                aria-hidden="true"
                class="pointer-events-none absolute -left-2 -top-6 select-none font-serif text-7xl leading-none text-ink-tertiary opacity-40 md:-left-8 md:-top-10 md:text-8xl"
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
              <span
                aria-hidden="true"
                class="pointer-events-none absolute -right-2 -bottom-2 select-none font-serif text-7xl leading-none text-ink-tertiary opacity-40 md:-right-8 md:-bottom-4 md:text-8xl"
              >
                &rdquo;
              </span>
            </figure>
          </div>

          <!-- Asterism: only when there is no quote to break the body -->
          <div
            v-else-if="description && description_2"
            aria-hidden="true"
            class="select-none text-center text-ink-tertiary"
          >
            <span class="font-serif text-xl tracking-[0.6em]">***</span>
          </div>

          <!-- Continuation — slightly smaller, secondary ink, like an addendum -->
          <div
            v-if="description_2"
            class="detail-rich-text font-serif text-base leading-[1.7] text-ink-secondary text-justify hyphens-auto"
            v-html="description_2"
          />
        </div>

        <!-- Credits footer — info + programme as one quiet band at the bottom. -->
        <footer
          v-if="info || programme"
          class="lg:col-span-12 border-t border-surface-3 pt-10"
        >
          <div class="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <div v-if="info" class="lg:col-span-7">
              <h3 class="mb-4 inline-block border-b-2 border-ink-primary pb-1 text-[11px] font-bold uppercase tracking-[0.25em] text-ink-primary">
                {{ t("production.details.extraInfo") }}
              </h3>
              <div
                class="detail-rich-text font-serif text-sm leading-[1.7] text-ink-secondary"
                v-html="info"
              />
            </div>

            <div
              v-if="programme"
              :class="info ? 'lg:col-span-5' : 'lg:col-span-7'"
            >
              <h3 class="mb-4 inline-block border-b-2 border-ink-primary pb-1 text-[11px] font-bold uppercase tracking-[0.25em] text-ink-primary">
                {{ t("production.details.programme") }}
              </h3>
              <div
                class="detail-rich-text font-serif text-sm leading-[1.7] text-ink-primary"
                v-html="programme"
              />
            </div>
          </div>
        </footer>

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
import { normalizeQuote, parseAndSanitizeContent, normalizePlainText } from "@/utils/parsers";
import ProductionDetailSidebarEvents from "@/components/production/ProductionDetailSidebarEvents.vue";
import type { EnrichedEvent } from "@/composables/useProductionEvents";
import type { ProductionTagChip } from "@/utils/tagDisplay";

const { t } = useI18n();

const emit = defineEmits<{ retryEvents: [] }>();

const currentLang = computed(
  () => i18n.global.locale.value as SupportedLang,
);

const props = withDefaults(
  defineProps<{
    production: ProductionWithBackwardsRefs;
    tagGroups: { label: string; tags: ProductionTagChip[] }[];
    totalTags: number;
    performanceEvents?: EnrichedEvent[];
    eventsLoading?: boolean;
    eventsError?: Error | null;
  }>(),
  {
    performanceEvents: () => [],
    eventsLoading: false,
    eventsError: null,
  },
);

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
const quote = computed(() =>
  normalizeQuote(normalizePlainText(tProd(props.production.quote))),
);
const quote_source = computed(() =>
  normalizePlainText(tProd(props.production.quote_source)),
);
const programme = computed(() => parseField(props.production.programme));
const info = computed(() => parseField(props.production.info));

const tagsExpanded = ref(true);

const showPerformanceBlock = computed(
  () =>
    props.eventsLoading ||
    props.eventsError !== null ||
    props.performanceEvents.length > 0,
);

const hasSidebarContent = computed(() => {
  const hasTags = props.tagGroups && props.tagGroups.length > 0;
  const hasTeaserText = !!teaser.value;
  const hasExtraText = !!description_extra.value;

  return hasTags || hasTeaserText || hasExtraText || showPerformanceBlock.value;
});

const mainContentClass = computed(() => {
  return hasSidebarContent.value
    ? "lg:col-start-1 lg:col-span-7"
    : "lg:col-span-12";
});
</script>

<style scoped>
@reference "@/style.css";

:deep(a) {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
  transition: opacity 0.2s;
}

:deep(a:hover) {
  text-decoration-thickness: 2px;
}

/*
 * Wrapper: `white-space: normal` so literal `\n` only between tags does not add
 * phantom bands (we minify those in the parser). `pre-line` on p/li keeps rare
 * in-flow line breaks from the CMS.
 *
 * Preflight zeros margins on p/ul/li outside `.prose`; this block is not
 * `.prose`, so we must restore vertical rhythm between paragraphs and lists.
 */
.detail-rich-text {
  white-space: normal;
}

.detail-rich-text :deep(p),
.detail-rich-text :deep(li) {
  white-space: pre-line;
}

.detail-rich-text :deep(> p) {
  @apply mb-6;
}

.detail-rich-text :deep(> p:last-child) {
  @apply mb-0;
}

.detail-rich-text :deep(> ul),
.detail-rich-text :deep(> ol) {
  @apply mb-6 list-disc pl-6;
}

.detail-rich-text :deep(> ol) {
  list-style: decimal;
}

.detail-rich-text :deep(> ul:last-child),
.detail-rich-text :deep(> ol:last-child) {
  @apply mb-0;
}

.detail-rich-text :deep(li) {
  @apply mb-1.5;
}

.detail-rich-text :deep(li:last-child) {
  @apply mb-0;
}

/*
 * Inter-tag `\r\n` used to show as blank bands under `whitespace-pre-line`; the
 * parser minifies those away. `<hr>` does not participate in newline “runs”,
 * but Preflight often leaves `<hr>` with no vertical margin, so the gap below
 * the rule must come from CSS (same band as paragraph spacing).
 */
.detail-rich-text :deep(> hr) {
  @apply my-6 w-full border-0 border-t border-surface-3;
}

/*
 * Drop cap on the lead paragraph. The `> :first-child` variant covers the
 * case where v-html wraps the description in a <p>; the bare selector
 * covers plain-text content. Using a direct-child combinator (not a
 * descendant selector) is essential — otherwise every element that
 * happens to be a first child (e.g. an <a> that is the only child of its
 * parent <p>) would also get a drop cap.
 *
 * Modern browsers (Safari, Chrome 110+) honour `initial-letter`, which
 * sizes the cap so it spans exactly N body lines AND aligns the cap's
 * top to the first line's top and its baseline to the Nth line's baseline.
 * Older browsers fall back to a float-based cap.
 */
.article-lead > :first-child::first-letter,
.article-lead::first-letter {
  font-family: var(--font-serif);
  font-weight: 700;
  color: var(--ink-primary);
  margin-right: 0.4rem;
  -webkit-initial-letter: 3;
  initial-letter: 3;
}

@supports not ((initial-letter: 3) or (-webkit-initial-letter: 3)) {
  .article-lead > :first-child::first-letter,
  .article-lead::first-letter {
    float: left;
    font-size: 4.8em;
    line-height: 1;
    margin: 0.05em 0.5rem 0 0;
  }
}
</style>
