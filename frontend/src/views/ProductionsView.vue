<template>
  <div class="flex min-h-screen flex-col bg-surface-0">
    <AppNavbar :is-dark="isDark" @toggle-dark="toggleDark" />
    <main class="flex-1">
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

      <section class="mx-auto max-w-5xl px-6 pb-20 pt-8 lg:px-10">
        <div v-if="!loading" class="mb-4 space-y-3">
          <div
            class="flex flex-col gap-2 pb-0.5 sm:flex-row sm:items-stretch sm:gap-3"
          >
            <ProductionsDateFilter
              v-model:year-range="explicitYearRange"
              v-model:date-from="filterDateFrom"
              v-model:date-to="filterDateTo"
              class="shrink-0"
              :disabled="loadError"
              :min-year="filterYearBounds.minYear"
              :max-year="filterYearBounds.maxYear"
            />
            <label class="sr-only" for="productions-search">{{
              t("productionsPage.searchLabel")
            }}</label>
            <div class="relative min-h-11 min-w-0 grow">
              <div
                class="productions-view__search-field"
                :class="
                  searchAwaitingList
                    ? 'cursor-not-allowed opacity-50'
                    : 'opacity-100'
                "
              >
                <button
                  v-for="(term, idx) in appliedSearchTerms"
                  :key="`${idx}-${term}`"
                  type="button"
                  class="productions-view__search-chip"
                  :disabled="listLoading"
                  :aria-label="
                    t('productionsPage.removeSearchTerm', { term })
                  "
                  @click.stop="removeSearchTermAt(idx)"
                >
                  <span class="min-w-0 truncate">{{ term }}</span>
                  <span class="text-base leading-none text-ink-secondary" aria-hidden="true">×</span>
                </button>
                <input
                  id="productions-search"
                  v-model="searchDraft"
                  type="search"
                  autocomplete="off"
                  :disabled="listLoading || loadError"
                  :placeholder="
                    appliedSearchTerms.length > 0
                      ? ''
                      : t('productionsPage.searchPlaceholder')
                  "
                  class="productions-view__search-input"
                  @keydown.enter.prevent="submitSearch"
                />
              </div>
              <button
                type="button"
                class="productions-view__search-submit"
                :aria-label="t('productionsPage.searchButton')"
                :disabled="listLoading || loadError"
                @click="submitSearch"
              >
                <svg
                  class="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </button>
            </div>
            <ProductionsSortControl
              :sort-by="sortBy"
              :sort-dir="sortDir"
              :disabled="listLoading || loadError"
              @sort-change="(p) => void applyProductionsSortChange(p)"
            />
          </div>
          <div
            v-if="
              !filtersPanelExpanded &&
                (genreTagsForFilter.length > 0 || showFiltersPanelExpandToggle)
            "
            :ref="setCompactGenreRowRef"
            class="mt-4 flex w-full flex-wrap items-center gap-x-2 gap-y-2 border-t border-surface-3 pt-4"
            :class="
              genreTagsForFilter.length > 0 && showFiltersPanelExpandToggle
                ? 'justify-between'
                : showFiltersPanelExpandToggle
                  ? 'justify-end'
                  : ''
            "
          >
            <div
              v-if="genreTagsForFilter.length > 0"
              class="flex min-w-0 flex-wrap items-center gap-2"
            >
              <button
                v-for="g in compactGenreTagsForRow"
                :key="'compact-genre-' + g.id"
                :ref="(el) => setCompactGenrePillRef(g.id, el)"
                type="button"
                class="productions-view__genre-collapsed-row-pill"
                :class="
                  selectedTagIds.includes(g.id)
                    ? 'border-tag-genre-bg bg-tag-genre-bg text-tag-genre-text'
                    : 'border-surface-3 bg-surface-1 text-ink-primary hover:bg-surface-2'
                "
                :disabled="listLoading || loadError"
                @click="toggleTag(g.id)"
              >
                {{ g.label }}
              </button>
            </div>
            <button
              v-if="showFiltersPanelExpandToggle"
              :ref="setCompactGenreExpandButtonRef"
              type="button"
              class="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-surface-3 bg-surface-0 text-ink-secondary transition hover:border-accent-outline hover:bg-surface-2 hover:text-ink-primary disabled:cursor-not-allowed disabled:opacity-100 dark:bg-surface-1"
              :disabled="listLoading || loadError"
              :aria-expanded="false"
              :aria-label="t('productionsPage.expandFiltersPanelAria')"
              aria-controls="productions-extended-filters"
              @click="filtersPanelExpanded = true"
            >
              <svg
                class="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>

          <div
            v-if="filtersPanelExpanded"
            id="productions-extended-filters"
            class="mt-4 space-y-4 rounded-lg border border-surface-3 bg-surface-1/50 px-4 py-4 shadow-sm ring-1 ring-inset ring-surface-3/40 dark:bg-surface-1/25"
          >
            <div
              v-if="genreTagsForFilter.length > 0"
              class="space-y-3"
            >
              <p
                class="text-xs font-medium uppercase tracking-wide text-ink-secondary"
              >
                {{ t("productionsPage.genreFiltersHeading") }}
              </p>
              <div :ref="setGenrePanelRowRef" class="flex items-start gap-3">
                <div class="flex min-w-0 flex-1 flex-wrap gap-2">
                  <button
                    v-for="g in visibleGenreTagsForFilter"
                    :key="g.id"
                    :ref="(el) => setGenrePanelPillRef(g.id, el)"
                    type="button"
                    class="productions-view__tag-filter-panel-pill"
                    :class="
                      selectedTagIds.includes(g.id)
                        ? 'border-tag-genre-bg bg-tag-genre-bg text-tag-genre-text'
                        : 'border-surface-3 bg-surface-1 text-ink-primary hover:bg-surface-2'
                    "
                    :disabled="listLoading || loadError"
                    @click="toggleTag(g.id)"
                  >
                    {{ g.label }}
                  </button>
                </div>
                <button
                  v-if="showGenreTagFilterExpandToggle"
                  :ref="setGenrePanelExpandButtonRef"
                  type="button"
                  class="productions-view__tag-filter-expand"
                  :disabled="listLoading || loadError"
                  :aria-expanded="genreTagFiltersExpanded"
                  :aria-label="
                    genreTagFiltersExpanded
                      ? t('productionsPage.viewLessTagFilters')
                      : t('productionsPage.viewMoreTagFilters')
                  "
                  @click="genreTagFiltersExpanded = !genreTagFiltersExpanded"
                >
                  {{
                    genreTagFiltersExpanded
                      ? t("productionsPage.viewLessTagFilters")
                      : t("productionsPage.viewMoreTagFilters")
                  }}
                </button>
              </div>
            </div>

            <div
              v-if="nonGenreTagsForFilter.length > 0"
              :class="
                genreTagsForFilter.length > 0
                  ? 'space-y-3 border-t border-surface-3 pt-4'
                  : 'space-y-3'
              "
            >
              <p
                class="text-xs font-medium uppercase tracking-wide text-ink-secondary"
              >
                {{ t("productionsPage.tagFiltersHeading") }}
              </p>
              <div :ref="setNonGenrePanelRowRef" class="flex items-start gap-3">
                <div class="flex min-w-0 flex-1 flex-wrap gap-2">
                  <button
                    v-for="g in visibleNonGenreTagsForFilter"
                    :key="g.id"
                    :ref="(el) => setNonGenrePanelPillRef(g.id, el)"
                    type="button"
                    class="productions-view__tag-filter-panel-pill"
                    :class="
                      selectedTagIds.includes(g.id)
                        ? 'border-accent-outline bg-surface-1 text-ink-primary'
                        : 'border-surface-3 bg-surface-1 text-ink-primary hover:bg-surface-2'
                    "
                    :disabled="listLoading || loadError"
                    @click="toggleTag(g.id)"
                  >
                    {{ g.label }}
                  </button>
                </div>
                <button
                  v-if="showNonGenreTagFilterExpandToggle"
                  :ref="setNonGenrePanelExpandButtonRef"
                  type="button"
                  class="productions-view__tag-filter-expand"
                  :disabled="listLoading || loadError"
                  :aria-expanded="nonGenreTagFiltersExpanded"
                  :aria-label="
                    nonGenreTagFiltersExpanded
                      ? t('productionsPage.viewLessTagFilters')
                      : t('productionsPage.viewMoreTagFilters')
                  "
                  @click="
                    nonGenreTagFiltersExpanded = !nonGenreTagFiltersExpanded
                  "
                >
                  {{
                    nonGenreTagFiltersExpanded
                      ? t("productionsPage.viewLessTagFilters")
                      : t("productionsPage.viewMoreTagFilters")
                  }}
                </button>
              </div>
            </div>

            <div
              class="flex justify-end border-t border-surface-3/80 pt-3"
            >
              <button
                type="button"
                class="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-surface-3 bg-surface-0 text-ink-secondary transition hover:border-accent-outline hover:bg-surface-2 hover:text-ink-primary disabled:cursor-not-allowed disabled:opacity-100 dark:bg-surface-1"
                :disabled="listLoading || loadError"
                :aria-expanded="true"
                :aria-label="t('productionsPage.collapseFiltersPanelAria')"
                @click="filtersPanelExpanded = false"
              >
                <svg
                  class="size-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="m18 15-6-6-6 6" />
                </svg>
              </button>
            </div>
          </div>

          <div
            v-if="
              filterBannerTagIds.length > 0 ||
                filterBannerYearRange !== null ||
                (filterBannerDateFrom && filterBannerDateTo)
            "
            class="productions-view__filter-banner"
          >
            <div class="flex min-w-0 flex-wrap items-center gap-2">
              <span class="text-sm text-ink-secondary">{{
                t("productionsPage.activeFiltersLabel")
              }}</span>
              <button
                v-for="tid in filterBannerTagIds"
                :key="'tag-' + tid"
                type="button"
                :class="['max-w-full', 'productions-view__active-chip']"
                :disabled="listLoading"
                :aria-label="t('productionsPage.removeTagFilter')"
                @click="removeTag(tid)"
              >
                <span class="min-w-0 truncate">{{ tagLabel(tid) }}</span>
                <span class="text-lg leading-none text-ink-secondary" aria-hidden="true">×</span>
              </button>
              <button
                v-if="filterBannerYearRange"
                type="button"
                :class="['productions-view__active-chip', 'tabular-nums']"
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
                :class="['max-w-full', 'productions-view__active-chip']"
                :disabled="listLoading"
                :aria-label="t('productionsPage.removeDateRangeFilter')"
                @click="clearDateRange"
              >
                <span class="min-w-0 truncate">{{ dateRangeSummary }}</span>
                <span class="text-lg leading-none text-ink-secondary" aria-hidden="true">×</span>
              </button>
            </div>
            <button
              type="button"
              class="productions-view__banner-action"
              :disabled="listLoading || loadError"
              @click="void clearAllNonSearchFilters()"
            >
              {{ t("productionsPage.clearAllFilters") }}
            </button>
          </div>
        </div>

        <p
          v-if="loadError"
          class="productions-view__alert"
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
            v-if="displayedFilteredTotal !== null"
            :class="[
              'mb-2 text-sm leading-normal text-ink-secondary tabular-nums',
              !filterBannerHasNonSearchChips() && 'mt-6',
            ]"
            aria-live="polite"
          >
            {{ filteredResultsCountLabel }}
          </p>

          <p
            v-if="totalCount === 0 && listLoading"
            class="py-16 text-center text-sm text-ink-secondary"
          >
            {{ t("productionsPage.loading") }}
          </p>
          <p
            v-else-if="totalCount === 0"
            class="py-16 text-center text-sm text-ink-secondary"
          >
            {{ emptyStateMessage }}
          </p>

          <div v-else>
            <ProductionListCard
              v-for="(p, idx) in productions"
              :key="`${currentPage}-${idx}-${p.id}`"
              :row-index="idx"
              :production="p"
              :date-summary="dateSummaryFor(p.id)"
              :tag-chips="tagChipsFor(p)"
              :halls-text="hallsTextFor(p.id)"
              :thumbnail-url="thumbnailFor(p.id)"
            />

            <nav
              v-if="totalPages > 1"
              class="productions-view__pagination"
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
                class="productions-view__pagination-toolbar"
                role="group"
                :aria-label="t('productionsPage.goToPage')"
              >
                <button
                  type="button"
                  class="productions-view__pager-btn"
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
                    class="productions-view__page-input"
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
                  class="productions-view__pager-btn"
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
    <AppFooter v-if="!loading" />
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
import type { LocationQuery, LocationQueryRaw } from "vue-router";
import {
  type Event as ProductionEvent,
  type Hall,
  type ProductionWithBackwardsRefs,
  type Tag,
  type TagType,
  PRODUCTION_LIST_DATE_RANGE_ORDER_MESSAGE,
  PRODUCTION_LIST_ERROR_CODE,
  PRODUCTION_LIST_YEAR_RANGE_ORDER_MESSAGE,
} from "@viernulvier/shared";
import AppFooter from "@/components/AppFooter.vue";
import AppNavbar from "@/components/nav/AppNavbar.vue";
import ProductionListCard from "@/components/productions/ProductionListCard.vue";
import ProductionsDateFilter from "@/components/productions/ProductionsDateFilter.vue";
import ProductionsSortControl from "@/components/productions/ProductionsSortControl.vue";
import { useDarkMode } from "@/composables/useDarkMode";
import { useFittingPills } from "@/composables/useFittingPills";
import { i18n, type SupportedLang } from "@/i18n";
import { getEventsForProductions } from "@/services/events";
import { getHalls } from "@/services/halls";
import { ApiError } from "@/services/api";
import { getImagesForProductionsOrEmpty } from "@/services/media";
import {
  getProductions,
  type ProductionSortBy,
  type ProductionSortDir,
} from "@/services/productions";
import { getTags, getTagTypes } from "@/services/tags";
import { localizeOrEmpty } from "@/utils/language-utils";
import {
  sortProductionTagChipsGenresFirst,
  tagTypeIsGenre,
  type ProductionTagChip,
} from "@/utils/tagDisplay";
import { pickProductionListThumbnailUrl } from "@/utils/productionThumbnails";
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

/**
 * Safety fallback when widths are not measurable (e.g. JSDOM tests).
 * Real browsers use measured row fit, not this cap.
 */
const COMPACT_GENRE_FALLBACK_MAX = 10;
const GENRE_PANEL_FALLBACK_MAX = 9;
const NON_GENRE_PANEL_FALLBACK_MAX = 6;

function selectedFirstTagFilterList(
  all: { id: number; label: string }[],
  selectedIds: readonly number[],
): { id: number; label: string }[] {
  const sel = new Set(selectedIds);
  const selected = all.filter((t) => sel.has(t.id));
  const rest = all.filter((t) => !sel.has(t.id));
  return [...selected, ...rest];
}

/** 1-based page index in the URL (`?page=1` is normalized away). */
const PAGE_QUERY_KEY = "page";

/** Same name as the list API query param; survives refresh and shareable URLs. */
const SEARCH_QUERY_KEY = "search";
const TAGS_QUERY_KEY = "tags";
const YEAR_MIN_QUERY_KEY = "yearMin";
const YEAR_MAX_QUERY_KEY = "yearMax";
const FROM_QUERY_KEY = "from";
const TO_QUERY_KEY = "to";
const SORT_BY_QUERY_KEY = "sortBy";
const SORT_DIR_QUERY_KEY = "sortDir";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const pageTopAnchor = useTemplateRef<HTMLElement>("pageTopAnchor");

/** Tag IDs for list filtering — genres and non-genres share `tags=` / `tagIds` (IDs are unique). */
const selectedTagIds = ref<number[]>([]);
const genreTagFiltersExpanded = ref(false);
const nonGenreTagFiltersExpanded = ref(false);
/** Full genre + tag filter sections (beyond compact preview row). */
const filtersPanelExpanded = ref(false);
/** `null` = all years in the archive slider span; otherwise inclusive calendar-year range. */
const explicitYearRange = ref<{ from: number; to: number } | null>(null);
const filterDateFrom = ref<string | null>(null);
const filterDateTo = ref<string | null>(null);
/**
 * Tag/year/date chips in the "Active filters" row. Row appears/updates after fetch
 * when adding the first non-search filter, and may stay visible (stale chips) until
 * fetch when removing the last non-search filter.
 */
const filterBannerTagIds = ref<number[]>([]);
const filterBannerYearRange = ref<{ from: number; to: number } | null>(null);
const filterBannerDateFrom = ref<string | null>(null);
const filterBannerDateTo = ref<string | null>(null);

function syncFilterBannerFromApplied() {
  filterBannerTagIds.value = [...selectedTagIds.value];
  filterBannerYearRange.value =
    explicitYearRange.value === null ? null : { ...explicitYearRange.value };
  filterBannerDateFrom.value = filterDateFrom.value;
  filterBannerDateTo.value = filterDateTo.value;
}

function hasAppliedNonSearchFilters(): boolean {
  return (
    selectedTagIds.value.length > 0 ||
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
 * Reads a positive 1-based page from a query object; invalid or missing -> 1.
 */
function readPageOneBasedFromQuery(q: LocationQuery): number {
  const raw = q[PAGE_QUERY_KEY];
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (s === undefined || s === null || s === "") return 1;
  const n = Number.parseInt(String(s), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

function readPageOneBasedFromRoute(): number {
  return readPageOneBasedFromQuery(route.query);
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

/** Reads inclusive calendar-year span from `yearMin` / `yearMax`. */
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

function readSortByFromRoute(): ProductionSortBy {
  const raw = route.query[SORT_BY_QUERY_KEY];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "name" ? "name" : "date";
}

function readSortDirFromRoute(): ProductionSortDir {
  const raw = route.query[SORT_DIR_QUERY_KEY];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "asc" ? "asc" : "desc";
}

function queryForPage0WithBase(
  page0: number,
  baseQuery: LocationQuery,
): LocationQueryRaw {
  const q: LocationQueryRaw = { ...baseQuery };
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
  const tagIds = selectedTagIds.value;
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
  if (filterDateFrom.value && filterDateTo.value) {
    q[FROM_QUERY_KEY] = filterDateFrom.value;
    q[TO_QUERY_KEY] = filterDateTo.value;
  } else {
    delete q[FROM_QUERY_KEY];
    delete q[TO_QUERY_KEY];
  }
  if (sortBy.value === "date" && sortDir.value === "desc") {
    delete q[SORT_BY_QUERY_KEY];
    delete q[SORT_DIR_QUERY_KEY];
  } else {
    q[SORT_BY_QUERY_KEY] = sortBy.value;
    q[SORT_DIR_QUERY_KEY] = sortDir.value;
  }
  return q;
}

function queryForPage0(page0: number): LocationQueryRaw {
  return queryForPage0WithBase(page0, route.query);
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

/** List jumps use instant scroll — `smooth` fights layout reflow (thumbnails resolving). Fallback scrolls doc only (not doc+body doubles). */
function scrollProductionsPageToTop(
  behavior: ScrollBehavior = "auto",
): void {
  const el = pageTopAnchor.value;
  if (el && typeof el.scrollIntoView === "function") {
    el.scrollIntoView({ behavior, block: "start" });
    return;
  }
  const doc = document.documentElement;
  if (typeof doc.scrollTo === "function") {
    doc.scrollTo({ top: 0, left: 0, behavior });
  } else {
    doc.scrollTop = 0;
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
const searchDraft = ref("");
const sortBy = ref<ProductionSortBy>("date");
const sortDir = ref<ProductionSortDir>("desc");
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

async function applyProductionsSortChange(parsed: {
  sortBy: ProductionSortBy;
  sortDir: ProductionSortDir;
}): Promise<void> {
  if (loading.value) return;
  if (parsed.sortBy === sortBy.value && parsed.sortDir === sortDir.value) return;

  sortBy.value = parsed.sortBy;
  sortDir.value = parsed.sortDir;

  listLoading.value = true;
  beginListAttempt();
  try {
    await fetchProductionsPageData(0);
    await replaceRouteForPage0(0);
    scrollAfterPageChange();
  } catch (err) {
    failListAttempt(err);
  } finally {
    listLoading.value = false;
  }
}

const hasActiveListFilters = computed(() => {
  if (appliedSearchTerms.value.length > 0) return true;
  if (selectedTagIds.value.length > 0) return true;
  if (explicitYearRange.value !== null) return true;
  if (filterDateFrom.value && filterDateTo.value) return true;
  return false;
});

const eventsByProduction = ref(new Map<number, ProductionEvent[]>());
/** Set after `GET /production/images` for thumbnails on the current list page. */
const thumbnailUrlByProductionId = ref(
  new Map<number, string | null>(),
);
/** Bumps on each thumbnail load; stale batches must not overwrite the map after a newer interaction. */
let thumbnailLoadGeneration = 0;
const tagsById = ref(new Map<number, Tag>());
const tagTypesById = ref(new Map<number, TagType>());
const hallsById = ref(new Map<number, Hall>());

function thumbnailFor(productionId: number): string | null {
  const m = thumbnailUrlByProductionId.value;
  if (!m.has(productionId)) {
    return null;
  }
  return m.get(productionId) ?? null;
}

async function loadThumbnailsForProductionIds(ids: number[]): Promise<void> {
  const gen = ++thumbnailLoadGeneration;
  if (ids.length === 0) {
    thumbnailUrlByProductionId.value = new Map();
    return;
  }
  const byProduction = await getImagesForProductionsOrEmpty(ids);
  if (gen !== thumbnailLoadGeneration) {
    return;
  }
  const next = new Map<number, string | null>();
  for (const id of ids) {
    next.set(
      id,
      pickProductionListThumbnailUrl(byProduction.get(id) ?? []),
    );
  }
  thumbnailUrlByProductionId.value = next;
}

const locale = computed(() => i18n.global.locale.value as SupportedLang);

const emptyStateMessage = computed(() => {
  const hasSearch = appliedSearchTerms.value.length > 0;
  const hasOther =
    selectedTagIds.value.length > 0 ||
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
    sortBy: sortBy.value,
    sortDir: sortDir.value,
    lang: locale.value,
  };
  if (appliedSearchTerms.value.length > 0) {
    args.search = appliedSearchTerms.value;
  }
  if (selectedTagIds.value.length > 0) {
    args.tagIds = [...selectedTagIds.value].sort((a, b) => a - b);
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
  const ids = items.map((p) => p.id);
  const eventsMap =
    ids.length === 0
      ? new Map<number, ProductionEvent[]>()
      : groupEventsByProductionId(await getEventsForProductions(ids));

  // Apply list + events together so cards never render with new productions but
  // stale/empty per-production events (avoids layout shift on title vs date/hall lines).
  productions.value = items;
  totalCount.value = total;
  currentPage.value = page0;
  displayedFilteredTotal.value = hasActiveListFilters.value ? total : null;
  syncFilterBannerFromApplied();
  eventsByProduction.value = eventsMap;
  thumbnailUrlByProductionId.value = new Map();
  await loadThumbnailsForProductionIds(ids);
}

function toggleTag(id: number) {
  const set = new Set(selectedTagIds.value);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  selectedTagIds.value = [...set].sort((a, b) => a - b);
}

function removeTag(id: number) {
  selectedTagIds.value = selectedTagIds.value.filter((x) => x !== id);
}

function clearYearRangeFilter() {
  explicitYearRange.value = null;
}

function clearDateRange() {
  filterDateFrom.value = null;
  filterDateTo.value = null;
}

async function scrollAfterPageChange(): Promise<void> {
  await nextTick();
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
  scrollProductionsPageToTop();
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
    const code = err.code;
    if (code === PRODUCTION_LIST_ERROR_CODE.DATE_RANGE_ORDER) {
      loadErrorDetail.value = t("productionsPage.invalidListDateRange");
      return;
    }
    if (code === PRODUCTION_LIST_ERROR_CODE.YEAR_RANGE_ORDER) {
      loadErrorDetail.value = t("productionsPage.invalidListYearRange");
      return;
    }
    if (err.message === PRODUCTION_LIST_DATE_RANGE_ORDER_MESSAGE) {
      loadErrorDetail.value = t("productionsPage.invalidListDateRange");
      return;
    }
    if (err.message === PRODUCTION_LIST_YEAR_RANGE_ORDER_MESSAGE) {
      loadErrorDetail.value = t("productionsPage.invalidListYearRange");
      return;
    }
    loadErrorDetail.value = err.message;
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
  appliedSearchTerms.value = dedupePreserveSearchCap([
    ...appliedSearchTerms.value,
    q,
  ]);
  searchDraft.value = "";
  listLoading.value = true;
  searchAwaitingList.value = true;
  beginListAttempt();
  try {
    await fetchProductionsPageData(0);
    await replaceRouteForPage0(0);
    scrollAfterPageChange();
  } catch (err) {
    failListAttempt(err);
  } finally {
    listLoading.value = false;
    searchAwaitingList.value = false;
  }
}

async function removeSearchTermAt(index: number) {
  const next = appliedSearchTerms.value.filter((_, i) => i !== index);
  if (next.length === appliedSearchTerms.value.length) return;
  listLoading.value = true;
  beginListAttempt();
  appliedSearchTerms.value = next;
  try {
    await fetchProductionsPageData(0);
    await replaceRouteForPage0(0);
    scrollAfterPageChange();
  } catch (err) {
    failListAttempt(err);
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

const genreTagsForFilter = computed(() => {
  const lang = locale.value;
  const items: { id: number; label: string }[] = [];
  const byId = tagsById.value;
  for (const tag of byId.values()) {
    const tt = tagTypesById.value.get(tag.tag_type as number);
    if (!tagTypeIsGenre(tt)) continue;
    const label = localizeOrEmpty(tag.name, lang);
    if (!label) continue;
    items.push({ id: tag.id, label });
  }
  items.sort((a, b) => {
    const ca = byId.get(a.id)?.production_count ?? 0;
    const cb = byId.get(b.id)?.production_count ?? 0;
    if (cb !== ca) return cb - ca;
    return a.label.localeCompare(b.label, lang);
  });
  return items;
});

const nonGenreTagsForFilter = computed(() => {
  const lang = locale.value;
  const items: { id: number; label: string }[] = [];
  const byId = tagsById.value;
  for (const tag of byId.values()) {
    const tt = tagTypesById.value.get(tag.tag_type as number);
    if (tagTypeIsGenre(tt)) continue;
    const label = localizeOrEmpty(tag.name, lang);
    if (!label) continue;
    items.push({ id: tag.id, label });
  }
  items.sort((a, b) => {
    const ca = byId.get(a.id)?.production_count ?? 0;
    const cb = byId.get(b.id)?.production_count ?? 0;
    if (cb !== ca) return cb - ca;
    return a.label.localeCompare(b.label, lang);
  });
  return items;
});

const genrePanelTagCandidates = computed(() =>
  selectedFirstTagFilterList(genreTagsForFilter.value, selectedTagIds.value),
);

const nonGenrePanelTagCandidates = computed(() =>
  selectedFirstTagFilterList(nonGenreTagsForFilter.value, selectedTagIds.value),
);

const compactGenreTagCandidates = computed(() =>
  selectedFirstTagFilterList(genreTagsForFilter.value, selectedTagIds.value),
);

const {
  setRowRef: setCompactGenreRowRef,
  setTrailingControlRef: setCompactGenreExpandButtonRef,
  setPillRef: setCompactGenrePillRef,
  visibleItems: compactGenreTagsForRow,
} = useFittingPills(compactGenreTagCandidates, {
  gapPx: 8,
  trailingControlGapPx: 4,
  fallbackVisibleCount: COMPACT_GENRE_FALLBACK_MAX,
});

const {
  setRowRef: setGenrePanelRowRef,
  setTrailingControlRef: setGenrePanelExpandButtonRef,
  setPillRef: setGenrePanelPillRef,
  visibleItems: collapsedGenrePanelTags,
} = useFittingPills(genrePanelTagCandidates, {
  gapPx: 8,
  fallbackVisibleCount: GENRE_PANEL_FALLBACK_MAX,
});

const {
  setRowRef: setNonGenrePanelRowRef,
  setTrailingControlRef: setNonGenrePanelExpandButtonRef,
  setPillRef: setNonGenrePanelPillRef,
  visibleItems: collapsedNonGenrePanelTags,
} = useFittingPills(nonGenrePanelTagCandidates, {
  gapPx: 8,
  fallbackVisibleCount: NON_GENRE_PANEL_FALLBACK_MAX,
});

const visibleGenreTagsForFilter = computed(() =>
  genreTagFiltersExpanded.value
    ? genrePanelTagCandidates.value
    : collapsedGenrePanelTags.value,
);

const visibleNonGenreTagsForFilter = computed(() =>
  nonGenreTagFiltersExpanded.value
    ? nonGenrePanelTagCandidates.value
    : collapsedNonGenrePanelTags.value,
);

const showGenreTagFilterExpandToggle = computed(
  () =>
    collapsedGenrePanelTags.value.length < genrePanelTagCandidates.value.length,
);

const showNonGenreTagFilterExpandToggle = computed(
  () =>
    collapsedNonGenrePanelTags.value.length <
    nonGenrePanelTagCandidates.value.length,
);

const showFiltersPanelExpandToggle = computed(
  () =>
    nonGenreTagsForFilter.value.length > 0 ||
    compactGenreTagsForRow.value.length < compactGenreTagCandidates.value.length,
);

/** Matches backend `yearMin`/`yearMax` bounds; not derived from loaded events (list loads events per page only). */
const filterYearBounds = computed(() => {
  const current = new Date().getFullYear();
  return { minYear: 2006, maxYear: Math.max(2006, current) };
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
  if (r.from === r.to) return String(r.from);
  return t("productionsPage.yearRangeChip", { from: r.from, to: r.to });
});

function tagLabel(id: number): string {
  const tag = tagsById.value.get(id);
  if (!tag) return String(id);
  return localizeOrEmpty(tag.name, locale.value) || String(id);
}

/**
 * True if any currently selected filter tag is not a genre (i.e. it belongs in
 * the expanded “Tags” section only).
 *
 * Used after hydration from the URL (`?tags=…`): non-genre chips are not shown in
 * the collapsed genre row, so we auto-expand the filter panel when those selections
 * would otherwise be invisible.
 */
function selectedIncludesNonGenreTag(): boolean {
  for (const id of selectedTagIds.value) {
    const tag = tagsById.value.get(id);
    if (!tag) continue;
    const tt = tagTypesById.value.get(tag.tag_type as number);
    if (!tagTypeIsGenre(tt)) return true;
  }
  return false;
}

/** Skip automatic refetch when clearing every non-search filter in one go (single `applyFilterChange` instead). */
let suppressNonSearchFilterWatch = false;

watch(
  [selectedTagIds, explicitYearRange, filterDateFrom, filterDateTo],
  async () => {
    if (loading.value || suppressNonSearchFilterWatch) return;
    await applyFilterChange();
  },
  { deep: true },
);

async function clearAllNonSearchFilters(): Promise<void> {
  if (
    !hasAppliedNonSearchFilters() ||
    listLoading.value ||
    loadError.value
  ) {
    return;
  }
  suppressNonSearchFilterWatch = true;
  try {
    selectedTagIds.value = [];
    explicitYearRange.value = null;
    filterDateFrom.value = null;
    filterDateTo.value = null;
    await nextTick();
  } finally {
    suppressNonSearchFilterWatch = false;
  }
  await applyFilterChange();
}

onMounted(async () => {
  loading.value = true;
  beginListAttempt();
  sortBy.value = readSortByFromRoute();
  sortDir.value = readSortDirFromRoute();
  const initialSearch = readSearchFromRoute();
  if (initialSearch.length > 0) {
    appliedSearchTerms.value = initialSearch;
  }
  const initialTags = readTagsFromRoute();
  if (initialTags.length > 0) selectedTagIds.value = initialTags;
  explicitYearRange.value = readYearRangeFromRoute();
  const initialRange = readDateRangeFromRoute();
  if (initialRange) {
    filterDateFrom.value = initialRange.from;
    filterDateTo.value = initialRange.to;
  }
  /** Year span and calendar period are mutually exclusive; keep dates if URL had both. */
  let syncRouteAfterExclusiveTimeFilter = false;
  if (
    explicitYearRange.value !== null &&
    filterDateFrom.value &&
    filterDateTo.value
  ) {
    explicitYearRange.value = null;
    syncRouteAfterExclusiveTimeFilter = true;
  }
  let page0 = Math.max(0, readPageOneBasedFromRoute() - 1);
  try {
    const [tags, halls, tagTypes] = await Promise.all([
      getTags(undefined, { includeProductionCount: true }),
      getHalls(),
      getTagTypes(),
    ]);
    tagsById.value = tagMapById(tags);
    tagTypesById.value = new Map(tagTypes.map((tt) => [tt.id, tt]));
    hallsById.value = hallMapById(halls);

    if (selectedIncludesNonGenreTag()) {
      filtersPanelExpanded.value = true;
    }

    /** Events for listing cards are loaded per page (see fetchProductionsPageData), not the full catalog. */
    await fetchProductionsPageData(page0);

    const tp = totalPages.value;
    if (tp === 0) {
      page0 = 0;
      await fetchProductionsPageData(0);
    } else {
      const clamped0 = Math.min(Math.max(0, page0), tp - 1);
      if (clamped0 !== page0) {
        await fetchProductionsPageData(clamped0);
        page0 = clamped0;
      }
    }

    if (syncRouteAfterExclusiveTimeFilter || urlNeedsSyncForPage0(page0)) {
      await replaceRouteForPage0(page0);
    }
  } catch (err) {
    failListAttempt(err);
  } finally {
    loading.value = false;
  }
});

/** Refetch when `?page=` changes (browser back/forward or programmatic `router.replace`). */
watch(
  () => readPageOneBasedFromRoute(),
  async () => {
    if (loading.value) return;
    if (totalPages.value <= 0) return;

    let page0 = readPageOneBasedFromQuery(route.query) - 1;
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

watch(
  () => `${readSortByFromRoute()}:${readSortDirFromRoute()}`,
  async (next) => {
    if (loading.value) return;
    const [nextByRaw, nextDirRaw] = next.split(":");
    const nextBy = nextByRaw === "date" ? "date" : "name";
    const nextDir = nextDirRaw === "desc" ? "desc" : "asc";
    if (nextBy === sortBy.value && nextDir === sortDir.value) return;
    sortBy.value = nextBy;
    sortDir.value = nextDir;
    listLoading.value = true;
    beginListAttempt();
    try {
      await fetchProductionsPageData(currentPage.value);
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
  return sortProductionTagChipsGenresFirst(chips);
}
</script>

<style scoped>
@reference "@/style.css";

.productions-view__tag-filter-expand {
  @apply inline-flex shrink-0 cursor-pointer justify-end self-start whitespace-nowrap pt-0.5 text-right text-sm font-medium leading-snug text-accent-outline underline decoration-from-font underline-offset-2 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-100;
  min-width: 6rem;
}

.productions-view__genre-collapsed-row-pill {
  @apply rounded-full border px-3 py-1 text-[0.95rem] transition disabled:opacity-100;
}

.productions-view__tag-filter-panel-pill {
  @apply rounded-full border px-2.75 py-1 text-sm transition disabled:opacity-100;
}

.productions-view__search-field {
  @apply box-border flex min-h-11 min-w-0 w-full flex-wrap items-center gap-1.5 rounded-md border border-surface-3 bg-surface-0 py-1.5 pl-2 pr-11 text-ink-primary transition focus-within:border-accent-outline dark:bg-surface-1;
}

.productions-view__search-input {
  @apply min-h-7 min-w-28 flex-1 border-0 bg-transparent px-1 py-0 text-base leading-normal text-ink-primary placeholder:text-ink-secondary focus:outline-none disabled:cursor-not-allowed disabled:opacity-100;
}

.productions-view__search-input::-webkit-search-cancel-button,
.productions-view__search-input::-webkit-search-decoration {
  -webkit-appearance: none;
  appearance: none;
}

.productions-view__search-chip {
  @apply inline-flex max-w-40 cursor-pointer items-center gap-1 rounded-md border border-surface-3 bg-surface-1 px-2 py-1 text-sm leading-tight text-ink-primary transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-100 dark:bg-surface-0;
}

.productions-view__search-submit {
  @apply absolute right-1 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-ink-secondary transition hover:bg-surface-2 hover:text-ink-primary disabled:cursor-not-allowed disabled:opacity-100;
}

.productions-view__banner-action {
  @apply col-start-2 row-start-1 shrink-0 cursor-pointer justify-self-end self-start pt-0.5 text-sm font-medium text-accent-outline underline decoration-from-font underline-offset-2 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-100;
}

.productions-view__filter-banner {
  @apply mb-4 mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-2 border-t border-surface-3 pt-5;
}

.productions-view__active-chip {
  @apply inline-flex cursor-pointer items-center gap-1 rounded-full border border-surface-3 bg-surface-0 py-1 pl-2.5 pr-1.5 text-sm text-ink-primary shadow-sm ring-1 ring-inset ring-accent-outline/25 transition hover:bg-surface-2 disabled:opacity-100 dark:bg-surface-1;
}

.productions-view__alert {
  @apply rounded-md border border-surface-3 bg-surface-1 px-4 py-3 text-sm text-ink-secondary;
}

.productions-view__pagination {
  @apply mt-10 grid grid-cols-1 justify-items-center gap-y-6 border-t border-surface-3 pt-8 sm:grid-cols-[1fr_auto] sm:items-center sm:justify-items-start sm:gap-x-12 sm:gap-y-0;
}

.productions-view__pagination-toolbar {
  @apply flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-self-end;
}

.productions-view__pager-btn {
  @apply cursor-pointer rounded-md border border-accent-outline bg-surface-0 px-3 py-1.5 text-sm font-medium text-ink-primary transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40;
}

.productions-view__page-input {
  @apply min-w-6 max-w-8 shrink-0 border-0 border-b border-surface-3 bg-transparent px-0 pb-px text-center text-sm tabular-nums text-ink-secondary focus:border-ink-primary focus:text-ink-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-40;
}
</style>
