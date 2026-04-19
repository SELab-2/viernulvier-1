<template>
  <div ref="dateFilterRoot" class="productions-date-filter relative inline-block">
    <button
      type="button"
      class="inline-flex cursor-pointer items-center gap-2 rounded-full border border-surface-3 bg-surface-0 px-4 py-2 text-sm font-medium text-ink-primary transition hover:bg-surface-2 disabled:opacity-100 dark:bg-surface-1"
      :disabled="disabled"
      :aria-expanded="panelOpen"
      aria-haspopup="dialog"
      @click.stop="panelOpen = !panelOpen"
    >
      <svg
        class="h-4 w-4 shrink-0 opacity-80"
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
      {{ t("productionsPage.selectDates") }}
    </button>

    <div
      v-if="panelOpen"
      class="absolute left-0 z-30 mt-2 w-[min(100vw-2rem,36rem)] max-h-[min(85vh,32rem)] origin-top-left overflow-y-auto rounded-xl border border-surface-3 bg-surface-1 p-4 shadow-lg"
      role="dialog"
      :aria-label="t('productionsPage.selectDates')"
      @click.stop
    >
      <section class="space-y-3">
        <h3 class="text-sm font-semibold text-ink-primary">
          {{ t("productionsPage.filterByYearRange") }}
        </h3>
        <p class="text-xs leading-snug text-ink-secondary">
          {{ t("productionsPage.yearRangeIntro") }}
        </p>

        <div class="year-range-control px-0.5 pt-1">
          <div
            ref="yearTrackRef"
            class="relative mx-auto h-10 w-full max-w-md"
            :aria-label="t('productionsPage.filterByYearRange')"
          >
            <div
              class="pointer-events-none absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-surface-3"
              aria-hidden="true"
            />
            <div
              class="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent-outline"
              :style="filledBarStyle"
              aria-hidden="true"
            />
            <input
              type="range"
              class="year-range-thumb year-range-thumb-low"
              :min="minYear"
              :max="maxYear"
              :step="1"
              :value="localFrom"
              :disabled="disabled || minYear === maxYear"
              :aria-valuemin="minYear"
              :aria-valuemax="maxYear"
              :aria-valuenow="localFrom"
              :aria-label="t('productionsPage.yearRangeFrom')"
              @input="onFromInput"
              @change="commitYearRange"
            />
            <input
              type="range"
              class="year-range-thumb year-range-thumb-high"
              :min="minYear"
              :max="maxYear"
              :step="1"
              :value="localTo"
              :disabled="disabled || minYear === maxYear"
              :aria-valuemin="minYear"
              :aria-valuemax="maxYear"
              :aria-valuenow="localTo"
              :aria-label="t('productionsPage.yearRangeTo')"
              @input="onToInput"
              @change="commitYearRange"
            />
            <!-- When both thumbs coincide, native hit-testing can't pick a side; drag X decides min vs max. -->
            <div
              v-show="collapsedOverlayVisible"
              class="absolute inset-0 z-10 cursor-grab touch-none active:cursor-grabbing"
              aria-hidden="true"
              @pointerdown="onCollapsedOverlayPointerDown"
              @pointermove="onCollapsedOverlayPointerMove"
              @pointerup="onCollapsedOverlayPointerUp"
              @pointercancel="onCollapsedOverlayPointerUp"
              @lostpointercapture="onCollapsedOverlayLostPointerCapture"
            />
          </div>
          <p
            class="mt-2 text-center text-sm font-medium tabular-nums text-ink-primary"
            aria-live="polite"
          >
            {{ localFrom }} – {{ localTo }}
          </p>
        </div>
      </section>

      <hr class="my-4 border-surface-3" />

      <section class="space-y-3">
        <h3 class="text-sm font-semibold text-ink-primary">
          {{ t("productionsPage.filterByDateRange") }}
        </h3>
        <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label class="flex min-w-0 flex-1 flex-col gap-1 text-xs text-ink-secondary">
            <span>{{ t("productionsPage.dateFrom") }}</span>
            <input
              v-model="dateFrom"
              type="date"
              :disabled="disabled"
              class="rounded-md border border-surface-3 bg-surface-0 px-2 py-1.5 text-sm text-ink-primary disabled:opacity-100 dark:bg-surface-0"
              @change="onDateInputsChange"
            />
          </label>
          <label class="flex min-w-0 flex-1 flex-col gap-1 text-xs text-ink-secondary">
            <span>{{ t("productionsPage.dateTo") }}</span>
            <input
              v-model="dateTo"
              type="date"
              :disabled="disabled"
              class="rounded-md border border-surface-3 bg-surface-0 px-2 py-1.5 text-sm text-ink-primary disabled:opacity-100 dark:bg-surface-0"
              @change="onDateInputsChange"
            />
          </label>
          <button
            v-if="dateFrom || dateTo"
            type="button"
            class="cursor-pointer rounded-md border border-surface-3 px-3 py-1.5 text-sm text-ink-secondary hover:bg-surface-2 disabled:opacity-100"
            :disabled="disabled"
            @click="clearDates"
          >
            {{ t("productionsPage.clearDateRange") }}
          </button>
        </div>
        <p class="text-center text-xs leading-snug text-ink-secondary">
          {{ t("productionsPage.dateRangeHint") }}
        </p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

type YearSpan = { from: number; to: number };

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    minYear: number;
    maxYear: number;
  }>(),
  { disabled: false },
);

const yearRange = defineModel<YearSpan | null>("yearRange", { required: true });
const dateFrom = defineModel<string | null>("dateFrom", { required: true });
const dateTo = defineModel<string | null>("dateTo", { required: true });

/** Calendar period vs year span are mutually exclusive (also catches v-model updates `@change` can miss). */
watch(
  () => [dateFrom.value, dateTo.value] as const,
  ([from, to]) => {
    if (from && to) yearRange.value = null;
  },
);

watch(
  yearRange,
  (yr) => {
    if (yr !== null) {
      dateFrom.value = null;
      dateTo.value = null;
    }
  },
  { immediate: true },
);

const { t } = useI18n();
const dateFilterRoot = ref<HTMLElement | null>(null);
const yearTrackRef = ref<HTMLElement | null>(null);
const panelOpen = ref(false);

const localFrom = ref(props.minYear);
const localTo = ref(props.maxYear);

const yearThumbsCoincide = computed(
  () =>
    props.minYear < props.maxYear && localFrom.value === localTo.value,
);

const collapsedDragActive = ref(false);
let collapsedDragPointerId: number | null = null;
let collapsedDragStartX = 0;
let collapsedDragStartFrom = 0;
let collapsedDragStartTo = 0;

const collapsedOverlayVisible = computed(() => {
  if (props.disabled || props.minYear >= props.maxYear) return false;
  return yearThumbsCoincide.value || collapsedDragActive.value;
});

function pxPerYearOnTrack(): number {
  const el = yearTrackRef.value;
  if (!el) return 48;
  const w = el.getBoundingClientRect().width;
  const span = Math.max(1, props.maxYear - props.minYear);
  return w / span;
}

function onCollapsedOverlayPointerDown(e: PointerEvent): void {
  if (props.disabled || e.button !== 0) return;
  if (!yearThumbsCoincide.value) return;
  const el = e.currentTarget as HTMLElement;
  el.setPointerCapture(e.pointerId);
  collapsedDragPointerId = e.pointerId;
  collapsedDragActive.value = true;
  collapsedDragStartX = e.clientX;
  collapsedDragStartFrom = localFrom.value;
  collapsedDragStartTo = localTo.value;
  e.preventDefault();
}

function onCollapsedOverlayPointerMove(e: PointerEvent): void {
  if (
    !collapsedDragActive.value ||
    collapsedDragPointerId !== e.pointerId
  ) {
    return;
  }
  const ppy = pxPerYearOnTrack();
  const dyears = Math.round(
    (e.clientX - collapsedDragStartX) / Math.max(1e-6, ppy),
  );
  const minY = props.minYear;
  const maxY = props.maxYear;
  let from = collapsedDragStartFrom + Math.min(0, dyears);
  let to = collapsedDragStartTo + Math.max(0, dyears);
  from = Math.min(maxY, Math.max(minY, from));
  to = Math.min(maxY, Math.max(minY, to));
  localFrom.value = from;
  localTo.value = to;
}

function finishCollapsedOverlayDrag(e: PointerEvent): void {
  if (!collapsedDragActive.value || collapsedDragPointerId !== e.pointerId) {
    return;
  }
  const el = e.currentTarget as HTMLElement;
  const pid = collapsedDragPointerId;
  collapsedDragPointerId = null;
  collapsedDragActive.value = false;
  commitYearRange();
  try {
    el.releasePointerCapture(pid);
  } catch {
    /* already released */
  }
}

function onCollapsedOverlayPointerUp(e: PointerEvent): void {
  finishCollapsedOverlayDrag(e);
}

function onCollapsedOverlayLostPointerCapture(e: PointerEvent): void {
  if (
    !collapsedDragActive.value ||
    collapsedDragPointerId !== e.pointerId
  ) {
    return;
  }
  collapsedDragPointerId = null;
  collapsedDragActive.value = false;
  commitYearRange();
}

function syncLocalsFromModel(): void {
  if (yearRange.value === null) {
    localFrom.value = props.minYear;
    localTo.value = props.maxYear;
    return;
  }
  localFrom.value = yearRange.value.from;
  localTo.value = yearRange.value.to;
}

watch(
  () => [yearRange.value, props.minYear, props.maxYear] as const,
  () => syncLocalsFromModel(),
  { immediate: true },
);

const filledBarStyle = computed(() => {
  const lo = props.minYear;
  const hi = props.maxYear;
  const span = Math.max(1, hi - lo);
  const p1 = ((localFrom.value - lo) / span) * 100;
  const p2 = ((localTo.value - lo) / span) * 100;
  return {
    left: `${p1}%`,
    width: `${Math.max(0, p2 - p1)}%`,
  };
});

function onFromInput(e: Event): void {
  const raw = Number((e.target as HTMLInputElement).value);
  if (!Number.isFinite(raw)) return;
  let v = Math.round(raw);
  v = Math.min(props.maxYear, Math.max(props.minYear, v));
  if (v > localTo.value) v = localTo.value;
  localFrom.value = v;
}

function onToInput(e: Event): void {
  const raw = Number((e.target as HTMLInputElement).value);
  if (!Number.isFinite(raw)) return;
  let v = Math.round(raw);
  v = Math.min(props.maxYear, Math.max(props.minYear, v));
  if (v < localFrom.value) v = localFrom.value;
  localTo.value = v;
}

function commitYearRange(): void {
  if (localFrom.value === props.minYear && localTo.value === props.maxYear) {
    yearRange.value = null;
  } else {
    yearRange.value = { from: localFrom.value, to: localTo.value };
  }
}

function clearDates(): void {
  dateFrom.value = null;
  dateTo.value = null;
}

function onDateInputsChange(): void {
  if (dateFrom.value && dateTo.value && dateFrom.value > dateTo.value) {
    const swap = dateTo.value;
    dateTo.value = dateFrom.value;
    dateFrom.value = swap;
  }
}

function onDocClick(ev: MouseEvent): void {
  if (!panelOpen.value) return;
  const el = dateFilterRoot.value;
  const target = ev.target;
  if (el && target instanceof Node && !el.contains(target)) panelOpen.value = false;
}

onMounted(() => {
  document.addEventListener("click", onDocClick);
});
onUnmounted(() => {
  document.removeEventListener("click", onDocClick);
});
</script>

<style scoped>
.year-range-thumb {
  -webkit-appearance: none;
  appearance: none;
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  width: 100%;
  height: 2.5rem;
  transform: translateY(-50%);
  margin: 0;
  background: transparent;
  pointer-events: none;
}

.year-range-thumb::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  pointer-events: auto;
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 9999px;
  border: 2px solid var(--color-accent-outline, #2563eb);
  background: var(--color-surface-0, #fff);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.15);
  cursor: grab;
}

.year-range-thumb::-moz-range-thumb {
  pointer-events: auto;
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 9999px;
  border: 2px solid var(--color-accent-outline, #2563eb);
  background: var(--color-surface-0, #fff);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.15);
  cursor: grab;
}

.year-range-thumb:active::-webkit-slider-thumb {
  cursor: grabbing;
}

.year-range-thumb:active::-moz-range-thumb {
  cursor: grabbing;
}

.year-range-thumb::-webkit-slider-runnable-track {
  background: transparent;
  height: 0.375rem;
}

.year-range-thumb::-moz-range-track {
  background: transparent;
  height: 0.375rem;
}

.year-range-thumb-low {
  z-index: 2;
}

.year-range-thumb-high {
  z-index: 3;
}
</style>

<style>
html.dark .productions-date-filter .year-range-thumb::-webkit-slider-thumb {
  background: var(--color-surface-1, #1e293b);
}

html.dark .productions-date-filter .year-range-thumb::-moz-range-thumb {
  background: var(--color-surface-1, #1e293b);
}
</style>
