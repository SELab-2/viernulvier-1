<template>
  <div class="min-h-screen bg-surface-0">
    <AppNavbar :is-dark="isDark" @toggle-dark="isDark = !isDark" />
    <main>
      <section
        ref="pageTopAnchor"
        class="scroll-mt-16 border-b border-surface-3 bg-surface-1 py-12 md:py-16"
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

      <section class="mx-auto max-w-4xl px-6 pb-20 pt-8 lg:px-10">
        <div v-if="!loading" class="mb-4 space-y-3">
          <div
            class="flex flex-col gap-2 pb-0.5 sm:flex-row sm:items-stretch sm:gap-3"
          >
            <label class="sr-only" for="productions-search">{{
              t("productionsPage.searchLabel")
            }}</label>
            <input
              id="productions-search"
              v-model="searchDraft"
              type="search"
              autocomplete="off"
              :disabled="listLoading || loadError"
              :placeholder="t('productionsPage.searchPlaceholder')"
              class="min-w-0 grow rounded-md border border-surface-3 bg-surface-0 px-3 py-2 text-base text-ink-primary placeholder:text-ink-secondary focus:border-accent-outline focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-surface-1"
              @keydown.enter.prevent="submitSearch"
            />
            <button
              type="button"
              class="shrink-0 cursor-pointer rounded-md border border-accent-outline bg-surface-0 px-4 py-2 text-base font-medium text-ink-primary transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="listLoading || loadError"
              @click="submitSearch"
            >
              {{ t("productionsPage.searchButton") }}
            </button>
          </div>
          <div
            v-if="appliedSearchTerm"
            class="flex flex-wrap items-center gap-2"
          >
            <span class="text-sm text-ink-secondary">{{
              t("productionsPage.activeSearchLabel")
            }}</span>
            <button
              type="button"
              class="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-accent-outline bg-surface-1 py-1 pl-3 pr-2 text-sm text-ink-primary transition hover:bg-surface-2"
              :disabled="listLoading"
              :aria-label="t('productionsPage.removeSearchFilter')"
              @click="clearSearchFilter"
            >
              <span class="min-w-0 truncate">{{ appliedSearchTerm }}</span>
              <span class="text-lg leading-none text-ink-secondary" aria-hidden="true">×</span>
            </button>
          </div>
        </div>

        <!-- Tag/date/… filters: add between search and the result count (inside content after load). -->

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

        <div v-else>
          <p
            v-if="appliedSearchTerm !== null"
            class="mb-2 min-h-5 text-sm leading-normal text-ink-secondary tabular-nums"
            aria-live="polite"
          >
            <template v-if="displayedFilteredTotal !== null">
              {{ filteredResultsCountLabel }}
            </template>
          </p>

          <p
            v-if="totalCount === 0"
            class="py-16 text-center text-sm text-ink-secondary"
          >
            {{ emptyStateMessage }}
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

            <nav
              v-if="totalPages > 1"
              class="mt-10 grid grid-cols-1 justify-items-center gap-y-6 border-t border-surface-3 pt-8 sm:grid-cols-[1fr_auto] sm:items-center sm:justify-items-start sm:gap-x-12 sm:gap-y-0"
              aria-label="Pagination"
            >
              <p class="text-center text-sm text-ink-secondary sm:text-left">
                {{
                  t("productionsPage.showingRange", {
                    from: rangeFrom,
                    to: rangeTo,
                    total: totalCount,
                  })
                }}
              </p>
              <div
                class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-self-end"
                role="group"
                :aria-label="t('productionsPage.goToPage')"
              >
                <button
                  type="button"
                  class="cursor-pointer rounded-md border border-accent-outline bg-surface-0 px-3 py-1.5 text-sm font-medium text-ink-primary transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
                  :disabled="currentPage <= 0 || listLoading"
                  @click="goToPage(currentPage - 1)"
                >
                  {{ t("productionsPage.prevPage") }}
                </button>
                <div
                  class="flex items-center gap-2 text-sm tabular-nums text-ink-secondary"
                >
                  <span class="whitespace-nowrap">{{
                    t("productionsPage.pageWord")
                  }}</span>
                  <input
                    :value="pageNumberInput"
                    type="text"
                    inputmode="numeric"
                    autocomplete="off"
                    maxlength="6"
                    :disabled="listLoading"
                    :aria-label="t('productionsPage.goToPage')"
                    class="min-w-6 max-w-8 shrink-0 border-0 border-b border-surface-3 bg-transparent px-0 pb-px text-center text-sm tabular-nums text-ink-secondary focus:border-ink-primary focus:text-ink-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                    @input="onPageNumberInput"
                    @keydown.enter.prevent="commitPageNumberInput"
                    @blur="commitPageNumberInput"
                  />
                  <span class="whitespace-nowrap">{{
                    t("productionsPage.pageOfTotal", { total: totalPages })
                  }}</span>
                </div>
                <button
                  type="button"
                  class="cursor-pointer rounded-md border border-accent-outline bg-surface-0 px-3 py-1.5 text-sm font-medium text-ink-primary transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
                  :disabled="currentPage >= totalPages - 1 || listLoading"
                  @click="goToPage(currentPage + 1)"
                >
                  {{ t("productionsPage.nextPage") }}
                </button>
              </div>
            </nav>
          </div>
        </div>
      </section>
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  ref,
  useTemplateRef,
  watch,
  watchEffect,
} from "vue";
import { useI18n } from "vue-i18n";
import type {
  Event as ProductionEvent,
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

const PAGE_SIZE = 20;

const { t } = useI18n();

const pageTopAnchor = useTemplateRef<HTMLElement>("pageTopAnchor");

function scrollProductionsPageToTop() {
  const el = pageTopAnchor.value;
  if (el && typeof el.scrollIntoView === "function") {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const doc = document.documentElement;
  const body = document.body;
  if (typeof doc.scrollTo === "function") {
    doc.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  } else {
    doc.scrollTop = 0;
  }
  if (typeof body.scrollTo === "function") {
    body.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  } else {
    body.scrollTop = 0;
  }
}

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
const listLoading = ref(false);
const loadError = ref(false);
const productions = ref<ProductionWithBackwardsRefs[]>([]);
const totalCount = ref(0);
const currentPage = ref(0);
/** Applied full-text filter (single chip; a new search replaces it). */
const appliedSearchTerm = ref<string | null>(null);
const searchDraft = ref("");
/**
 * Total matching the active search, shown only after a successful list fetch
 * for that search (avoids flashing the unfiltered total while loading).
 */
const displayedFilteredTotal = ref<number | null>(null);

const emptyStateMessage = computed(() =>
  appliedSearchTerm.value
    ? t("productionsPage.noSearchResults")
    : t("productionsPage.empty"),
);

const filteredResultsCountLabel = computed(() => {
  const n = displayedFilteredTotal.value;
  if (n === null) return "";
  return n === 1
    ? t("productionsPage.filterResultsSingle")
    : t("productionsPage.filterResultsPlural", { count: n });
});

function productionsListArgs(page: number) {
  return {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    ...(appliedSearchTerm.value
      ? { search: appliedSearchTerm.value }
      : {}),
  };
}

async function loadProductionsPage(
  page: number,
  options: { scroll?: boolean } = {},
) {
  const shouldScroll = options.scroll ?? false;
  listLoading.value = true;
  loadError.value = false;
  try {
    const { items, total } = await getProductions(productionsListArgs(page));
    productions.value = items;
    totalCount.value = total;
    currentPage.value = page;
    if (appliedSearchTerm.value !== null) {
      displayedFilteredTotal.value = total;
    } else {
      displayedFilteredTotal.value = null;
    }
    if (shouldScroll) {
      await nextTick();
      requestAnimationFrame(() => {
        scrollProductionsPageToTop();
      });
    }
  } catch {
    loadError.value = true;
  } finally {
    listLoading.value = false;
  }
}

async function submitSearch() {
  const q = searchDraft.value.trim();
  if (!q) {
    await clearSearchFilter();
    return;
  }
  displayedFilteredTotal.value = null;
  appliedSearchTerm.value = q;
  await loadProductionsPage(0, { scroll: true });
}

async function clearSearchFilter() {
  displayedFilteredTotal.value = null;
  appliedSearchTerm.value = null;
  searchDraft.value = "";
  await loadProductionsPage(0, { scroll: true });
}

const totalPages = computed(() =>
  totalCount.value === 0 ? 0 : Math.ceil(totalCount.value / PAGE_SIZE),
);

/** 1-based page shown in the pagination field (digits only while editing). */
const pageNumberInput = ref("1");

watch(currentPage, (p) => {
  if (totalPages.value > 0) {
    pageNumberInput.value = String(p + 1);
  }
});

function onPageNumberInput(e: Event) {
  pageNumberInput.value = (e.target as HTMLInputElement).value.replace(
    /\D/g,
    "",
  );
}

async function commitPageNumberInput() {
  if (totalPages.value <= 0) return;

  const raw = pageNumberInput.value.replace(/\D/g, "").trim();
  if (raw === "") {
    pageNumberInput.value = String(currentPage.value + 1);
    return;
  }

  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) {
    pageNumberInput.value = String(currentPage.value + 1);
    return;
  }

  const pageOneBased = Math.min(Math.max(1, n), totalPages.value);
  if (pageOneBased === currentPage.value + 1) {
    pageNumberInput.value = String(pageOneBased);
    return;
  }

  await goToPage(pageOneBased - 1);
  pageNumberInput.value = String(currentPage.value + 1);
}

const rangeFrom = computed(() =>
  totalCount.value === 0 ? 0 : currentPage.value * PAGE_SIZE + 1,
);

const rangeTo = computed(() =>
  Math.min((currentPage.value + 1) * PAGE_SIZE, totalCount.value),
);
const eventsByProduction = ref(new Map<number, ProductionEvent[]>());
const tagsById = ref(new Map<number, Tag>());
const tagTypesById = ref(new Map<number, TagType>());
const hallsById = ref(new Map<number, Hall>());

const locale = computed(() => i18n.global.locale.value as SupportedLang);

onMounted(async () => {
  loading.value = true;
  loadError.value = false;
  try {
    const [page, tags, events, halls, tagTypes] = await Promise.all([
      getProductions(productionsListArgs(0)),
      getTags(),
      getEvents(),
      getHalls(),
      getTagTypes(),
    ]);
    productions.value = page.items;
    totalCount.value = page.total;
    currentPage.value = 0;
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

async function goToPage(page: number) {
  if (page < 0) return;
  if (totalPages.value > 0 && page >= totalPages.value) return;
  await loadProductionsPage(page, { scroll: true });
}

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
