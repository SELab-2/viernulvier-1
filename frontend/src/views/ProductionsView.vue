<template>
  <div class="min-h-screen bg-surface-0">
    <AppNavbar :is-dark="isDark" @toggle-dark="toggleDark" />
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
              class="min-w-0 grow rounded-md border border-surface-3 bg-surface-0 px-3 py-2 text-base text-ink-primary placeholder:text-ink-secondary focus:border-accent-outline focus:outline-none dark:bg-surface-1"
              :class="
                searchAwaitingList
                  ? 'disabled:cursor-not-allowed disabled:opacity-50'
                  : 'disabled:opacity-100'
              "
              @keydown.enter.prevent="submitSearch"
            />
            <button
              type="button"
              class="shrink-0 cursor-pointer rounded-md border border-accent-outline bg-surface-0 px-4 py-2 text-base font-medium text-ink-primary transition hover:bg-surface-2"
              :class="
                searchAwaitingList
                  ? 'disabled:cursor-not-allowed disabled:opacity-40'
                  : 'disabled:opacity-100'
              "
              :disabled="listLoading || loadError"
              @click="submitSearch"
            >
              {{ t("productionsPage.searchButton") }}
            </button>
          </div>
          <div
            v-if="searchBannerTerms.length > 0"
            class="flex flex-wrap items-center gap-2"
          >
            <span class="text-sm text-ink-secondary">{{
              t("productionsPage.activeSearchLabel")
            }}</span>
            <button
              v-for="(term, idx) in searchBannerTerms"
              :key="`${idx}-${term}`"
              type="button"
              class="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-accent-outline bg-surface-1 py-1 pl-3 pr-2 text-sm text-ink-primary transition hover:bg-surface-2 disabled:opacity-100"
              :disabled="listLoading"
              :aria-label="
                t('productionsPage.removeSearchTerm', { term })
              "
              @click="removeSearchTermAt(idx)"
            >
              <span class="min-w-0 truncate">{{ term }}</span>
              <span class="text-lg leading-none text-ink-secondary" aria-hidden="true">×</span>
            </button>
          </div>

          <div
            v-if="genreTagsForFilter.length > 0"
            class="mt-4 space-y-3 border-t border-surface-3 pt-4"
          >
            <p
              class="text-xs font-medium uppercase tracking-wide text-ink-secondary"
            >
              {{ t("productionsPage.genreFiltersHeading") }}
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="g in genreTagsForFilter"
                :key="g.id"
                type="button"
                class="rounded-full border px-3 py-1 text-sm transition disabled:opacity-100"
                :class="
                  selectedGenreTagIds.includes(g.id)
                    ? 'border-tag-genre-bg bg-tag-genre-bg text-tag-genre-text'
                    : 'border-surface-3 bg-surface-1 text-ink-primary hover:bg-surface-2'
                "
                :disabled="listLoading || loadError"
                @click="toggleGenreTag(g.id)"
              >
                {{ g.label }}
              </button>
            </div>
          </div>

          <div
            class="mt-4 flex flex-wrap items-center gap-2 border-t border-surface-3 pt-4"
          >
            <ProductionsDateFilter
              v-model:year-range="explicitYearRange"
              v-model:date-from="filterDateFrom"
              v-model:date-to="filterDateTo"
              :disabled="listLoading || loadError"
              :min-year="filterYearBounds.minYear"
              :max-year="filterYearBounds.maxYear"
            />
          </div>

          <div
            v-if="
              filterBannerTagIds.length > 0 ||
              filterBannerYearRange !== null ||
              (filterBannerDateFrom && filterBannerDateTo)
            "
            class="mb-4 flex flex-wrap items-center gap-2 border-t border-surface-3 pt-4"
          >
            <span class="text-sm text-ink-secondary">{{
              t("productionsPage.activeFiltersLabel")
            }}</span>
            <button
              v-for="tid in filterBannerTagIds"
              :key="'tag-' + tid"
              type="button"
              class="inline-flex max-w-full cursor-pointer items-center gap-1 rounded-full border border-accent-outline bg-surface-1 py-1 pl-2.5 pr-1.5 text-sm text-ink-primary hover:bg-surface-2 disabled:opacity-100"
              :disabled="listLoading"
              :aria-label="t('productionsPage.removeGenreFilter')"
              @click="removeGenreTag(tid)"
            >
              <span class="min-w-0 truncate">{{ tagLabel(tid) }}</span>
              <span class="text-lg leading-none text-ink-secondary" aria-hidden="true">×</span>
            </button>
            <button
              v-if="filterBannerYearRange"
              type="button"
              class="inline-flex cursor-pointer items-center gap-1 rounded-full border border-accent-outline bg-surface-1 py-1 pl-2.5 pr-1.5 text-sm tabular-nums text-ink-primary hover:bg-surface-2 disabled:opacity-100"
              :disabled="listLoading"
              :aria-label="t('productionsPage.removeYearRangeFilter')"
              @click="clearYearRangeFilter"
            >
              {{ yearRangeChipSummary }}
              <span class="text-lg leading-none text-ink-secondary" aria-hidden="true">×</span>
            </button>
            <button
              v-if="filterBannerDateFrom && filterBannerDateTo"
              type="button"
              class="inline-flex max-w-full cursor-pointer items-center gap-1 rounded-full border border-accent-outline bg-surface-1 py-1 pl-2.5 pr-1.5 text-sm text-ink-primary hover:bg-surface-2 disabled:opacity-100"
              :disabled="listLoading"
              :aria-label="t('productionsPage.removeDateRangeFilter')"
              @click="clearDateRange"
            >
              <span class="min-w-0 truncate">{{ dateRangeSummary }}</span>
              <span class="text-lg leading-none text-ink-secondary" aria-hidden="true">×</span>
            </button>
          </div>
        </div>

        <p
          v-if="loadError"
          class="rounded-md border border-surface-3 bg-surface-1 px-4 py-3 text-sm text-ink-secondary"
          role="alert"
        >
          {{ loadErrorDetail ?? t("productionsPage.error") }}
        </p>

        <p
          v-else-if="loading"
          class="py-16 text-center text-sm text-ink-secondary"
        >
          {{ t("productionsPage.loading") }}
        </p>

        <div v-else>
          <p
            v-if="showFilteredResultsCountLine"
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
} from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import type { LocationQueryRaw } from "vue-router";
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
import ProductionsDateFilter from "@/components/productions/ProductionsDateFilter.vue";
import { useDarkMode } from "@/composables/useDarkMode";
import { i18n, type SupportedLang } from "@/i18n";
import { getEvents } from "@/services/events";
import { getHalls } from "@/services/halls";
import { ApiError } from "@/services/api";
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

/** Same cap as the list API, extra terms are ignored client-side. */
const MAX_SEARCH_TERMS = 20;

/** Keep in sync with `PRODUCTION_LIST_DATE_RANGE_ORDER_MESSAGE` in backend `pagination.ts`. */
const PRODUCTION_LIST_DATE_RANGE_ORDER_MESSAGE =
  "`from` must be on or before `to`" as const;
/** Keep in sync with `PRODUCTION_LIST_YEAR_RANGE_ORDER_MESSAGE` in backend `pagination.ts`. */
const PRODUCTION_LIST_YEAR_RANGE_ORDER_MESSAGE =
  "`yearMin` must be on or before `yearMax`" as const;

/** 1-based page index in the URL (`?page=1` is normalized away). */
const PAGE_QUERY_KEY = "page";

/** Same name as the list API query param; survives refresh and shareable URLs. */
const SEARCH_QUERY_KEY = "search";
const TAGS_QUERY_KEY = "tags";
const YEARS_QUERY_KEY = "years";
const YEAR_MIN_QUERY_KEY = "yearMin";
const YEAR_MAX_QUERY_KEY = "yearMax";
const FROM_QUERY_KEY = "from";
const TO_QUERY_KEY = "to";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const pageTopAnchor = useTemplateRef<HTMLElement>("pageTopAnchor");

/** Genre tags toggled for list filtering (AND). */
const selectedGenreTagIds = ref<number[]>([]);
/** `null` = all years in the archive slider span; otherwise inclusive calendar-year range. */
const explicitYearRange = ref<{ from: number; to: number } | null>(null);
const filterDateFrom = ref<string | null>(null);
const filterDateTo = ref<string | null>(null);
/**
 * Tag/year/date chips in the "Active filters" row. Row appears/updates after fetch
 * when adding the first non-search filter, and may stay visible (stale chips) until
 * fetch when removing the last non-search filter -> same idea as searchBannerTerms.
 */
const filterBannerTagIds = ref<number[]>([]);
const filterBannerYearRange = ref<{ from: number; to: number } | null>(null);
const filterBannerDateFrom = ref<string | null>(null);
const filterBannerDateTo = ref<string | null>(null);

function syncFilterBannerFromApplied() {
  filterBannerTagIds.value = [...selectedGenreTagIds.value];
  filterBannerYearRange.value =
    explicitYearRange.value === null ? null : { ...explicitYearRange.value };
  filterBannerDateFrom.value = filterDateFrom.value;
  filterBannerDateTo.value = filterDateTo.value;
}

function hasAppliedNonSearchFilters(): boolean {
  return (
    selectedGenreTagIds.value.length > 0 ||
    explicitYearRange.value !== null ||
    !!(filterDateFrom.value && filterDateTo.value)
  );
}

function filterBannerHasNonSearchChips(): boolean {
  return (
    filterBannerTagIds.value.length > 0 ||
    filterBannerYearRange.value !== null ||
    !!(filterBannerDateFrom.value && filterBannerDateTo.value)
  );
}

/**
 * Reads a positive 1-based page from the route query; invalid or missing -> 1.
 */
function readPageOneBasedFromRoute(): number {
  const raw = route.query[PAGE_QUERY_KEY];
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (s === undefined || s === null || s === "") return 1;
  const n = Number.parseInt(String(s), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

function dedupeSearchTermsPreserveOrder(terms: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of terms) {
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

function readSearchFromRoute(): string[] {
  const raw = route.query[SEARCH_QUERY_KEY];
  if (raw === undefined || raw === null || raw === "") return [];
  const parts = (Array.isArray(raw) ? raw : [raw])
    .flatMap((s) => String(s).split(","))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return dedupePreserveSearchCap(parts);
}

function dedupePreserveSearchCap(parts: string[]): string[] {
  return dedupeSearchTermsPreserveOrder(parts).slice(0, MAX_SEARCH_TERMS);
}

function readTagsFromRoute(): number[] {
  const raw = route.query[TAGS_QUERY_KEY];
  const joined = Array.isArray(raw) ? raw.join(",") : raw;
  if (joined === undefined || joined === null || joined === "") return [];
  const out: number[] = [];
  for (const part of String(joined).split(",")) {
    const n = Number.parseInt(part.trim(), 10);
    if (Number.isFinite(n) && n > 0) out.push(n);
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

function readLegacyYearsListFromRoute(): number[] | null {
  const raw = route.query[YEARS_QUERY_KEY];
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (s === undefined || s === null || s === "") return null;
  const out: number[] = [];
  for (const part of String(s).split(",")) {
    const n = Number.parseInt(part.trim(), 10);
    if (Number.isFinite(n) && n >= 1900 && n <= 2100) out.push(n);
  }
  const u = [...new Set(out)].sort((a, b) => a - b);
  return u.length > 0 ? u : null;
}

/** Prefer `yearMin`/`yearMax`; legacy `years=` is folded to an inclusive span (min–max). */
function readYearRangeFromRoute(): { from: number; to: number } | null {
  const rawMin = route.query[YEAR_MIN_QUERY_KEY];
  const rawMax = route.query[YEAR_MAX_QUERY_KEY];
  const sMin = Array.isArray(rawMin) ? rawMin[0] : rawMin;
  const sMax = Array.isArray(rawMax) ? rawMax[0] : rawMax;
  if (
    sMin !== undefined &&
    sMin !== "" &&
    sMax !== undefined &&
    sMax !== ""
  ) {
    const from = Number.parseInt(String(sMin), 10);
    const to = Number.parseInt(String(sMax), 10);
    if (
      Number.isFinite(from) &&
      Number.isFinite(to) &&
      from >= 1900 &&
      to <= 2100 &&
      from <= to
    ) {
      return { from, to };
    }
  }
  const legacy = readLegacyYearsListFromRoute();
  if (legacy !== null && legacy.length > 0) {
    return { from: legacy[0], to: legacy[legacy.length - 1] };
  }
  return null;
}

function readDateRangeFromRoute(): { from: string; to: string } | null {
  const rawF = route.query[FROM_QUERY_KEY];
  const rawT = route.query[TO_QUERY_KEY];
  const f = Array.isArray(rawF) ? rawF[0] : rawF;
  const rawTo = Array.isArray(rawT) ? rawT[0] : rawT;
  if (!f || !rawTo) return null;
  const from = String(f);
  const toStr = String(rawTo);
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(from) || !re.test(toStr) || from > toStr) return null;
  return { from, to: toStr };
}

function queryForPage0(page0: number): LocationQueryRaw {
  const q: LocationQueryRaw = { ...route.query };
  if (page0 <= 0) {
    delete q[PAGE_QUERY_KEY];
  } else {
    q[PAGE_QUERY_KEY] = String(page0 + 1);
  }
  const terms = appliedSearchTerms.value;
  if (terms.length > 0) {
    q[SEARCH_QUERY_KEY] = terms.join(",");
  } else {
    delete q[SEARCH_QUERY_KEY];
  }
  const tagIds = selectedGenreTagIds.value;
  if (tagIds.length > 0) {
    q[TAGS_QUERY_KEY] = [...tagIds].sort((a, b) => a - b).join(",");
  } else {
    delete q[TAGS_QUERY_KEY];
  }
  if (explicitYearRange.value !== null) {
    q[YEAR_MIN_QUERY_KEY] = String(explicitYearRange.value.from);
    q[YEAR_MAX_QUERY_KEY] = String(explicitYearRange.value.to);
  } else {
    delete q[YEAR_MIN_QUERY_KEY];
    delete q[YEAR_MAX_QUERY_KEY];
  }
  delete q[YEARS_QUERY_KEY];
  if (filterDateFrom.value && filterDateTo.value) {
    q[FROM_QUERY_KEY] = filterDateFrom.value;
    q[TO_QUERY_KEY] = filterDateTo.value;
  } else {
    delete q[FROM_QUERY_KEY];
    delete q[TO_QUERY_KEY];
  }
  return q;
}

function urlNeedsSyncForPage0(page0: number): boolean {
  const raw = route.query[PAGE_QUERY_KEY];
  const cur =
    raw === undefined || raw === null || raw === ""
      ? undefined
      : String(Array.isArray(raw) ? raw[0] : raw);
  const want = page0 <= 0 ? undefined : String(page0 + 1);
  if (want === undefined) {
    return cur !== undefined && cur !== "";
  }
  return cur !== want;
}

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

const { isDark, toggleDark } = useDarkMode();
const loading = ref(true);
const listLoading = ref(false);
const loadError = ref(false);
const loadErrorDetail = ref<string | null>(null);
const productions = ref<ProductionWithBackwardsRefs[]>([]);
const totalCount = ref(0);
const currentPage = ref(0);
const appliedSearchTerms = ref<string[]>([]);
/**
 * Terms shown in the "Search:" chip row. The results count line also keys off
 * `hasActiveListFilters` so it can show while the first term’s fetch runs.
 * When clearing all terms, this stays populated until the unfiltered list has loaded,
 * so layout does not jump while stale filtered cards are still on screen.
 * When adding the first term, same as non-search filters: row appears only after fetch.
 */
const searchBannerTerms = ref<string[]>([]);
const searchDraft = ref("");
/**
 * Total matching the current list query; updated on each successful fetch.
 * While search/filter list loads we keep the previous value so the results line
 * does not blank out (same idea as filter-only fetches).
 */
const displayedFilteredTotal = ref<number | null>(null);
/**
 * True only while a list fetch was triggered by submitting a new search term.
 * Dims the search field + button; removing pills, clearing all search, and filter fetches do not.
 */
const searchAwaitingList = ref(false);

const hasActiveListFilters = computed(() => {
  if (appliedSearchTerms.value.length > 0) return true;
  if (selectedGenreTagIds.value.length > 0) return true;
  if (explicitYearRange.value !== null) return true;
  if (filterDateFrom.value && filterDateTo.value) return true;
  return false;
});

const showFilteredResultsCountLine = computed(
  () =>
    hasActiveListFilters.value ||
    searchBannerTerms.value.length > 0 ||
    filterBannerTagIds.value.length > 0 ||
    filterBannerYearRange.value !== null ||
    !!(filterBannerDateFrom.value && filterBannerDateTo.value),
);

const emptyStateMessage = computed(() => {
  const hasSearch = appliedSearchTerms.value.length > 0;
  const hasOther =
    selectedGenreTagIds.value.length > 0 ||
    explicitYearRange.value !== null ||
    !!(filterDateFrom.value && filterDateTo.value);
  if (!hasSearch && !hasOther) return t("productionsPage.empty");
  if (hasSearch && !hasOther) return t("productionsPage.noSearchResults");
  return t("productionsPage.noFilterResults");
});

const filteredResultsCountLabel = computed(() => {
  const n = displayedFilteredTotal.value;
  if (n === null) return "";
  return n === 1
    ? t("productionsPage.filterResultsSingle")
    : t("productionsPage.filterResultsPlural", { count: n });
});

function productionsListArgs(page: number) {
  const args: Parameters<typeof getProductions>[0] = {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };
  if (appliedSearchTerms.value.length > 0) {
    args.search = appliedSearchTerms.value;
  }
  if (selectedGenreTagIds.value.length > 0) {
    args.tagIds = [...selectedGenreTagIds.value].sort((a, b) => a - b);
  }
  if (explicitYearRange.value !== null) {
    args.yearMin = explicitYearRange.value.from;
    args.yearMax = explicitYearRange.value.to;
  }
  const df = filterDateFrom.value;
  const dt = filterDateTo.value;
  if (df && dt) {
    args.dateFrom = df;
    args.dateTo = dt;
  }
  return args;
}

async function fetchProductionsPageData(page0: number) {
  const { items, total } = await getProductions(productionsListArgs(page0));
  productions.value = items;
  totalCount.value = total;
  currentPage.value = page0;
  displayedFilteredTotal.value = hasActiveListFilters.value ? total : null;
  searchBannerTerms.value = [...appliedSearchTerms.value];
  syncFilterBannerFromApplied();
}

function toggleGenreTag(id: number) {
  const set = new Set(selectedGenreTagIds.value);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  selectedGenreTagIds.value = [...set].sort((a, b) => a - b);
}

function removeGenreTag(id: number) {
  selectedGenreTagIds.value = selectedGenreTagIds.value.filter((x) => x !== id);
}

function clearYearRangeFilter() {
  explicitYearRange.value = null;
}

function clearDateRange() {
  filterDateFrom.value = null;
  filterDateTo.value = null;
}

function scrollAfterPageChange() {
  void nextTick();
  requestAnimationFrame(() => {
    scrollProductionsPageToTop();
  });
}

async function replaceRouteForPage0(page0: number) {
  await router.replace({
    path: route.path,
    query: queryForPage0(page0),
    hash: route.hash,
  });
}

function beginListAttempt() {
  loadError.value = false;
  loadErrorDetail.value = null;
}

function failListAttempt(err: unknown) {
  loadError.value = true;
  if (err instanceof ApiError && err.status === 400) {
    loadErrorDetail.value =
      err.message === PRODUCTION_LIST_DATE_RANGE_ORDER_MESSAGE
        ? t("productionsPage.invalidListDateRange")
        : err.message === PRODUCTION_LIST_YEAR_RANGE_ORDER_MESSAGE
          ? t("productionsPage.invalidListYearRange")
          : err.message;
    return;
  }
  loadErrorDetail.value = null;
}

async function applyFilterChange() {
  listLoading.value = true;
  beginListAttempt();
  // Like search chips: show the filter row after fetch when adding the *first*
  // non-search filter; when clearing the last non-search filter while search stays on,
  // keep the row until fetch. Only sync early when updating an already-visible row.
  if (
    hasActiveListFilters.value &&
    filterBannerHasNonSearchChips() &&
    hasAppliedNonSearchFilters()
  ) {
    syncFilterBannerFromApplied();
  }
  try {
    await fetchProductionsPageData(0);
    await replaceRouteForPage0(0);
    scrollAfterPageChange();
  } catch (err) {
    failListAttempt(err);
    syncFilterBannerFromApplied();
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
  const lower = q.toLowerCase();
  if (appliedSearchTerms.value.some((t) => t.toLowerCase() === lower)) {
    searchDraft.value = "";
    return;
  }
  if (appliedSearchTerms.value.length >= MAX_SEARCH_TERMS) {
    searchDraft.value = "";
    return;
  }
  const hadVisibleSearchPillRow = searchBannerTerms.value.length > 0;
  appliedSearchTerms.value = dedupePreserveSearchCap([
    ...appliedSearchTerms.value,
    q,
  ]);
  if (hadVisibleSearchPillRow) {
    searchBannerTerms.value = [...appliedSearchTerms.value];
  }
  listLoading.value = true;
  searchAwaitingList.value = true;
  beginListAttempt();
  try {
    await fetchProductionsPageData(0);
    await replaceRouteForPage0(0);
    scrollAfterPageChange();
    searchDraft.value = "";
  } catch (err) {
    failListAttempt(err);
    searchBannerTerms.value = [...appliedSearchTerms.value];
  } finally {
    listLoading.value = false;
    searchAwaitingList.value = false;
  }
}

async function removeSearchTermAt(index: number) {
  const next = appliedSearchTerms.value.filter((_, i) => i !== index);
  if (next.length === appliedSearchTerms.value.length) return;
  if (next.length > 0) {
    searchBannerTerms.value = [...next];
  }
  appliedSearchTerms.value = next;
  listLoading.value = true;
  beginListAttempt();
  try {
    await fetchProductionsPageData(0);
    await replaceRouteForPage0(0);
    scrollAfterPageChange();
  } catch (err) {
    failListAttempt(err);
    searchBannerTerms.value = [...appliedSearchTerms.value];
  } finally {
    listLoading.value = false;
  }
}

async function clearSearchFilter() {
  appliedSearchTerms.value = [];
  searchDraft.value = "";
  listLoading.value = true;
  beginListAttempt();
  try {
    await fetchProductionsPageData(0);
    await replaceRouteForPage0(0);
    scrollAfterPageChange();
  } catch (err) {
    failListAttempt(err);
    searchBannerTerms.value = [...appliedSearchTerms.value];
  } finally {
    listLoading.value = false;
  }
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

const genreTagsForFilter = computed(() => {
  const lang = locale.value;
  const items: { id: number; label: string }[] = [];
  for (const tag of tagsById.value.values()) {
    const tt = tagTypesById.value.get(tag.tag_type as number);
    if (!tagTypeIsGenre(tt)) continue;
    const label = localizeOrEmpty(tag.name, lang);
    if (!label) continue;
    items.push({ id: tag.id, label });
  }
  items.sort((a, b) => a.label.localeCompare(b.label, lang));
  return items;
});

const filterYearBounds = computed(() => {
  const current = new Date().getFullYear();
  let minY = Number.POSITIVE_INFINITY;
  let any = false;
  for (const evs of eventsByProduction.value.values()) {
    for (const ev of evs) {
      if (!ev.starts_at) continue;
      any = true;
      const sy = new Date(ev.starts_at).getFullYear();
      minY = Math.min(minY, sy);
    }
  }
  if (!any) {
    return { minYear: current, maxYear: current };
  }
  return {
    minYear: minY,
    maxYear: current,
  };
});

/** `YYYY-MM-DD` → `dd/mm/yyyy` for filter chips (fixed order for every locale). */
function formatIsoDateAsDdMmYyyy(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

const dateRangeSummary = computed(() => {
  const from = filterBannerDateFrom.value;
  const to = filterBannerDateTo.value;
  if (!from || !to) return "";
  return t("productionsPage.dateRangeChip", {
    from: formatIsoDateAsDdMmYyyy(from),
    to: formatIsoDateAsDdMmYyyy(to),
  });
});

const yearRangeChipSummary = computed(() => {
  const r = filterBannerYearRange.value;
  if (!r) return "";
  return t("productionsPage.yearRangeChip", { from: r.from, to: r.to });
});

function tagLabel(id: number): string {
  const tag = tagsById.value.get(id);
  if (!tag) return String(id);
  return localizeOrEmpty(tag.name, locale.value) || String(id);
}

watch(
  [selectedGenreTagIds, explicitYearRange, filterDateFrom, filterDateTo],
  async () => {
    if (loading.value) return;
    await applyFilterChange();
  },
  { deep: true },
);

onMounted(async () => {
  loading.value = true;
  beginListAttempt();
  const initialSearch = readSearchFromRoute();
  if (initialSearch.length > 0) {
    appliedSearchTerms.value = initialSearch;
  }
  const initialTags = readTagsFromRoute();
  if (initialTags.length > 0) selectedGenreTagIds.value = initialTags;
  explicitYearRange.value = readYearRangeFromRoute();
  const initialRange = readDateRangeFromRoute();
  if (initialRange) {
    filterDateFrom.value = initialRange.from;
    filterDateTo.value = initialRange.to;
  }
  const requestedOneBased = readPageOneBasedFromRoute();
  let page0 = Math.max(0, requestedOneBased - 1);
  try {
    const [page, tags, events, halls, tagTypes] = await Promise.all([
      getProductions(productionsListArgs(page0)),
      getTags(),
      getEvents(),
      getHalls(),
      getTagTypes(),
    ]);
    totalCount.value = page.total;
    const tp =
      totalCount.value === 0
        ? 0
        : Math.ceil(totalCount.value / PAGE_SIZE);

    if (tp > 0) {
      const clamped0 = Math.min(Math.max(0, page0), tp - 1);
      if (clamped0 !== page0) {
        page0 = clamped0;
        const again = await getProductions(productionsListArgs(page0));
        productions.value = again.items;
        totalCount.value = again.total;
      } else {
        productions.value = page.items;
      }
    } else {
      productions.value = page.items;
      page0 = 0;
    }

    currentPage.value = page0;
    displayedFilteredTotal.value = hasActiveListFilters.value
      ? totalCount.value
      : null;
    searchBannerTerms.value = [...appliedSearchTerms.value];
    syncFilterBannerFromApplied();
    tagsById.value = tagMapById(tags);
    tagTypesById.value = new Map(tagTypes.map((tt) => [tt.id, tt]));
    hallsById.value = hallMapById(halls);
    eventsByProduction.value = groupEventsByProductionId(events);

    if (urlNeedsSyncForPage0(page0)) {
      await replaceRouteForPage0(page0);
    }
  } catch (err) {
    failListAttempt(err);
  } finally {
    loading.value = false;
  }
});

watch(
  () => readPageOneBasedFromRoute(),
  async (oneBased) => {
    if (loading.value) return;
    if (totalPages.value <= 0) return;

    let page0 = oneBased - 1;
    const max0 = totalPages.value - 1;
    const clamped0 = Math.min(Math.max(0, page0), max0);
    if (page0 !== clamped0) {
      await replaceRouteForPage0(clamped0);
      return;
    }
    page0 = clamped0;

    if (page0 === currentPage.value) return;

    listLoading.value = true;
    beginListAttempt();
    try {
      await fetchProductionsPageData(page0);
      scrollAfterPageChange();
    } catch (err) {
      failListAttempt(err);
    } finally {
      listLoading.value = false;
    }
  },
);

async function goToPage(page: number) {
  if (page < 0 || page >= totalPages.value) return;
  listLoading.value = true;
  beginListAttempt();
  try {
    await fetchProductionsPageData(page);
    await replaceRouteForPage0(page);
    scrollAfterPageChange();
  } catch (err) {
    failListAttempt(err);
  } finally {
    listLoading.value = false;
  }
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
