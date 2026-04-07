<template>
  <div class="min-h-screen bg-surface-0">
    <AppNavbar :is-dark="isDark" @toggle-dark="isDark = !isDark" />
    <main>
      <section
        class="border-b border-surface-3 bg-surface-1 py-12 md:py-16"
      >
        <div class="mx-auto max-w-3xl px-6 text-center lg:px-10">
          <h1
            class="text-2xl font-bold tracking-tight text-ink-primary md:text-3xl"
          >
            {{ t("productionsPage.heading") }}
          </h1>
          <p
            class="mt-4 text-sm leading-relaxed text-ink-secondary md:text-base"
          >
            {{ t("productionsPage.intro") }}
          </p>
        </div>
      </section>

      <section class="mx-auto max-w-4xl px-6 pb-20 pt-4 lg:px-10">
        <p
          v-if="loadError"
          class="rounded-md border border-surface-3 bg-surface-1 px-4 py-3 text-sm text-ink-secondary"
          role="alert"
        >
          {{ t("productionsPage.error") }}
        </p>

        <p
          v-else-if="loading"
          class="py-16 text-center text-sm text-ink-secondary"
        >
          {{ t("productionsPage.loading") }}
        </p>

        <p
          v-else-if="!productions.length"
          class="py-16 text-center text-sm text-ink-secondary"
        >
          {{ t("productionsPage.empty") }}
        </p>

        <div v-else>
          <ProductionListCard
            v-for="p in productions"
            :key="p.id"
            :production="p"
            :date-summary="dateSummaryFor(p.id)"
            :tag-chips="tagChipsFor(p)"
            :halls-text="hallsTextFor(p.id)"
          />
        </div>
      </section>
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watchEffect } from "vue";
import { useI18n } from "vue-i18n";
import type {
  Event,
  Hall,
  ProductionWithBackwardsRefs,
  Tag,
  TagType,
} from "@viernulvier/shared";
import AppFooter from "@/components/AppFooter.vue";
import AppNavbar from "@/components/AppNavbar.vue";
import ProductionListCard from "@/components/productions/ProductionListCard.vue";
import { i18n, type SupportedLang } from "@/i18n";
import { getEvents } from "@/services/events";
import { getHalls } from "@/services/halls";
import { getProductions } from "@/services/productions";
import { getTags, getTagTypes } from "@/services/tags";
import { localizeOrEmpty } from "@/utils/i18n";
import { tagTypeIsGenre, type ProductionTagChip } from "@/utils/tagDisplay";
import {
  distinctHallNames,
  groupEventsByProductionId,
  hallMapById,
  summarizeProductionDates,
  tagMapById,
} from "@/utils/productionsOverview";

const { t } = useI18n();

function getInitialDark(): boolean {
  const stored = localStorage.getItem("viernulvier-dark");
  if (stored !== null) return stored === "true";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

const isDark = ref(getInitialDark());

watchEffect(() => {
  const htmlEl = document.documentElement;
  if (isDark.value) htmlEl.classList.add("dark");
  else htmlEl.classList.remove("dark");
  localStorage.setItem("viernulvier-dark", String(isDark.value));
});

const loading = ref(true);
const loadError = ref(false);
const productions = ref<ProductionWithBackwardsRefs[]>([]);
const eventsByProduction = ref(new Map<number, Event[]>());
const tagsById = ref(new Map<number, Tag>());
const tagTypesById = ref(new Map<number, TagType>());
const hallsById = ref(new Map<number, Hall>());

const locale = computed(() => i18n.global.locale.value as SupportedLang);

onMounted(async () => {
  loading.value = true;
  loadError.value = false;
  try {
    const [prods, tags, events, halls, tagTypes] = await Promise.all([
      getProductions(),
      getTags(),
      getEvents(),
      getHalls(),
      getTagTypes(),
    ]);
    productions.value = prods;
    tagsById.value = tagMapById(tags);
    tagTypesById.value = new Map(tagTypes.map((tt) => [tt.id, tt]));
    hallsById.value = hallMapById(halls);
    eventsByProduction.value = groupEventsByProductionId(events);
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
});

function dateSummaryFor(productionId: number) {
  const evs = eventsByProduction.value.get(productionId);
  return summarizeProductionDates(evs, locale.value);
}

function hallsTextFor(productionId: number) {
  const evs = eventsByProduction.value.get(productionId);
  const names = distinctHallNames(evs, hallsById.value, locale.value);
  return names.join(" · ");
}

function tagChipsFor(production: ProductionWithBackwardsRefs): ProductionTagChip[] {
  const lang = locale.value;
  const chips: ProductionTagChip[] = [];
  for (const tid of production.tags as number[]) {
    const tag = tagsById.value.get(tid);
    if (!tag) continue;
    const name = localizeOrEmpty(tag.name, lang);
    if (!name) continue;
    const tagType = tagTypesById.value.get(tag.tag_type as number);
    chips.push({
      tagId: tid,
      label: name,
      isGenre: tagTypeIsGenre(tagType),
    });
  }
  return chips;
}
</script>
