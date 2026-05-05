<!-- eslint-disable vue/no-v-html -- All v-html bindings in this file render strings produced by parseAndSanitizeContent, which routes HTML through DOMPurify. -->
<template>
  <div class="bg-surface-1 text-ink-primary">
    <div class="mx-auto max-w-7xl px-6 py-24 md:px-12">
      <section class="flex flex-col gap-16 lg:grid lg:grid-cols-12 lg:gap-x-16 lg:gap-y-24">

        <!--
          Sidebar — marginalia first, then a tag drawer below.
          The teaser block used to be a dark promo card; it is now a
          quiet kantlijn-aantekening: a thin vertical rule on the left,
          italic serif copy. The accordion mechanic for tags is kept
          (productions can carry many tags) but with lighter chrome.
        -->
        <aside v-if="hasSidebarContent" class="lg:col-start-9 lg:col-span-4">
          <div class="sticky top-32 h-fit space-y-8">

            <div
              v-if="teaser || description_extra"
              class="border-l-2 border-ink-tertiary pl-5 md:pl-6"
            >
              <div
                v-if="teaser"
                class="font-serif text-base italic leading-relaxed text-ink-primary md:text-lg"
                v-html="teaser"
              />
              <div
                v-if="description_extra"
                class="font-serif text-sm leading-relaxed text-ink-secondary"
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
                  <h3 class="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-secondary">
                    {{ t("production.details.tags") }}
                  </h3>
                  <span class="text-[10px] text-ink-tertiary">
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
                    <span class="text-[9px] font-semibold uppercase tracking-[0.15em] text-ink-tertiary">
                      {{ group.label }}
                    </span>
                    <div class="flex flex-wrap gap-2">
                      <span
                        v-for="tag in group.tags"
                        :key="tag"
                        class="border border-surface-3 bg-surface-1 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-ink-secondary hover:border-ink-tertiary transition-colors cursor-default"
                      >
                        {{ tag }}
                      </span>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </aside>

        <!--
          Main column — long-form article body.

          Order: lead paragraph (drop cap) → pull quote in the middle →
          continuation paragraph. If there is no quote and both paragraphs
          exist, an asterism (***) marks the break instead.
        -->
        <div :class="['space-y-12 lg:row-start-1', mainContentClass]">

          <!-- Lead paragraph — drop cap on first letter, justified -->
          <div
            v-if="description"
            class="article-lead font-serif text-lg leading-[1.7] text-ink-primary md:text-xl whitespace-pre-line text-justify hyphens-auto"
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
            class="font-serif text-base leading-[1.7] text-ink-secondary whitespace-pre-line text-justify hyphens-auto"
            v-html="description_2"
          />

          <!--
            End-mark — the classic newspaper "story ends here" sign.
            Renders only when the body had any content to close out.
          -->
          <div
            v-if="description || description_2 || quote"
            aria-hidden="true"
            class="select-none pt-4 text-center text-xs font-semibold tracking-[0.4em] text-ink-tertiary"
          >
            &mdash;30&mdash;
          </div>
        </div>

        <!--
          Credits footer — info + programme as one quiet band at the bottom
          of the section. Replaces the old separate boxed programme block
          and the italic info block. Two columns when both exist; the side
          that is absent simply collapses.
        -->
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
                class="font-serif text-sm leading-[1.7] text-ink-secondary whitespace-pre-line"
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
                class="font-serif text-sm leading-[1.7] text-ink-primary whitespace-pre-line"
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
 * Drop cap on the lead paragraph. We target the first letter of the first
 * child element because v-html wraps the description in a <p>, so plain
 * `.article-lead::first-letter` would otherwise miss it.
 *
 * Modern browsers (Safari, Chrome 110+) honour `initial-letter`, which
 * sizes the cap so it spans exactly N body lines AND aligns the cap's
 * top to the first line's top and its baseline to the Nth line's baseline.
 * Older browsers fall back to a float-based cap.
 */
.article-lead :first-child::first-letter,
.article-lead::first-letter {
  font-family: var(--font-serif);
  font-weight: 700;
  color: var(--ink-primary);
  margin-right: 0.4rem;
  -webkit-initial-letter: 3;
  initial-letter: 3;
}

@supports not ((initial-letter: 3) or (-webkit-initial-letter: 3)) {
  .article-lead :first-child::first-letter,
  .article-lead::first-letter {
    float: left;
    font-size: 4.8em;
    line-height: 1;
    margin: 0.05em 0.5rem 0 0;
  }
}
</style>
