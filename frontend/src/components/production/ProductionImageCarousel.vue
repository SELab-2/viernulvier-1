<template>
  <div
    v-if="slides.length > 0"
    class="relative outline-none focus-visible:ring-2 focus-visible:ring-accent-outline focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0"
    role="region"
    tabindex="0"
    :aria-label="t('production.gallery.carouselLabel')"
    :aria-roledescription="t('production.gallery.carouselRegion')"
    @keydown.left.prevent="onCarouselArrowLeft"
    @keydown.right.prevent="onCarouselArrowRight"
  >
    <div data-testid="carousel-viewport" :class="carouselViewportWidthClass">
      <div class="relative">
        <CarouselArrowButton
          v-if="showNav"
          direction="prev"
          :disabled="!canGoPrev"
          :ariaLabel="t('production.gallery.prev')"
          @click="goPrev"
        />

        <div
          ref="scrollerRef"
          :data-band="slides.length >= 3 ? 'compact' : 'comfort'"
          :class="[
            'carousel-track flex items-center gap-5 overflow-x-auto overflow-y-hidden md:gap-6',
            hideScrollbarClass,
            centerCarouselRowWhenWideNoOverflow ? 'justify-center' : 'justify-start',
          ]"
          @scroll="onScrollThrottled"
        >
          <div
            v-for="(item, i) in slides"
            :key="`${i}-${item.src}`"
            data-testid="carousel-slide"
            class="carousel-slide"
          >
            <button
              type="button"
              data-testid="carousel-img-trigger"
              class="carousel-img-trigger group block cursor-pointer overflow-hidden rounded-md border-0 bg-transparent p-0 text-left transition-[filter] duration-200 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-outline"
              :aria-label="t('production.gallery.openLightbox')"
              aria-haspopup="dialog"
              @click="openLightbox(i)"
            >
              <img
                :src="item.src"
                :alt="item.alt"
                class="carousel-img"
                loading="lazy"
                decoding="async"
                referrerpolicy="no-referrer"
                @load="scheduleLayoutMetrics"
              />
            </button>
          </div>
        </div>

        <CarouselArrowButton
          v-if="showNav"
          direction="next"
          :disabled="!canGoNext"
          :ariaLabel="t('production.gallery.next')"
          @click="goNext"
        />
      </div>

      <div
        v-if="showScreenPager"
        class="mt-4 flex flex-wrap items-center justify-center gap-2"
        role="group"
        :aria-label="t('production.gallery.screenDotsGroupLabel')"
      >
        <button
          v-for="(_, i) in screenScrollTargets"
          :key="i"
          type="button"
          class="h-2.5 w-2.5 rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-outline"
          :class="
            i === activeScreenIndex
              ? 'scale-110 bg-ink-primary'
              : 'bg-ink-secondary/35 hover:bg-ink-secondary/55'
          "
          :aria-label="
            t('production.gallery.goToScreen', { n: i + 1, total: screenCount })
          "
          :aria-current="i === activeScreenIndex ? 'true' : undefined"
          @click="goToScreen(i)"
        />
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="lightboxIndex !== null && lightboxSlide !== null"
        class="fixed inset-0 z-[200] flex items-center justify-center px-6 py-12 sm:px-10 sm:py-14 md:px-16 md:py-20"
        role="dialog"
        aria-modal="true"
        :aria-label="t('production.gallery.lightboxTitle')"
      >
        <div
          class="absolute inset-0 bg-black/30 backdrop-blur-sm"
          aria-hidden="true"
          data-testid="lightbox-backdrop"
          @click="closeLightbox"
        />
        <div
          class="relative z-[201] mx-auto flex w-full max-w-4xl items-center justify-center md:max-w-5xl"
        >
          <div class="relative inline-block max-w-full">
            <button
              type="button"
              class="absolute right-1 top-1 z-10 flex size-8 items-center justify-center rounded-full border border-white/30 bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:right-2 md:top-2 md:size-9"
              :aria-label="t('production.gallery.closeLightbox')"
              data-testid="lightbox-close"
              @click.stop="closeLightbox"
            >
              <svg
                class="size-4 md:size-[1.125rem]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
            <img
              :src="lightboxSlide.src"
              :alt="lightboxSlide.alt"
              class="block max-h-[min(72vh,38rem)] w-auto max-w-full object-contain sm:max-h-[min(74vh,42rem)]"
              decoding="async"
              referrerpolicy="no-referrer"
              data-testid="lightbox-image"
              @click.stop
            />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  useTemplateRef,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import CarouselArrowButton from "@/components/production/CarouselArrowButton.vue";

export interface CarouselSlide {
  src: string;
  alt: string;
}

const props = defineProps<{
  slides: CarouselSlide[];
}>();

const { t } = useI18n();

const scrollerRef = useTemplateRef<HTMLElement>("scrollerRef");
/** Active slide index when lightbox open; `null` when closed */
const lightboxIndex = ref<number | null>(null);
const lightboxSlide = computed(() => {
  const i = lightboxIndex.value;
  if (i === null || i < 0 || i >= props.slides.length) return null;
  return props.slides[i]!;
});

const canGoPrev = ref(false);
const canGoNext = ref(false);
/** Scroll positions for each “screen” (same steps as prev/next, last = max). */
const screenScrollTargets = ref<number[]>([0]);
const activeScreenIndex = ref(0);
const hideScrollbarClass =
  "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

function openLightbox(index: number): void {
  lightboxIndex.value = index;
}

function closeLightbox(): void {
  lightboxIndex.value = null;
}

function onCarouselArrowLeft(): void {
  if (lightboxIndex.value !== null) return;
  goPrev();
}

function onCarouselArrowRight(): void {
  if (lightboxIndex.value !== null) return;
  goNext();
}

function onGlobalKeydown(e: KeyboardEvent): void {
  if (e.key === "Escape" && lightboxIndex.value !== null) {
    e.preventDefault();
    closeLightbox();
  }
}

onMounted(() => {
  window.addEventListener("resize", onResize);
  window.addEventListener("keydown", onGlobalKeydown);
  void nextTick(() => {
    applyLayoutMetrics();
    const sc = scrollerRef.value;
    if (typeof ResizeObserver !== "undefined" && sc) {
      carouselResizeObserver = new ResizeObserver(() => {
        scheduleLayoutMetrics();
      });
      carouselResizeObserver.observe(sc);
    }
  });
});
onUnmounted(() => {
  window.removeEventListener("resize", onResize);
  window.removeEventListener("keydown", onGlobalKeydown);
  carouselResizeObserver?.disconnect();
  carouselResizeObserver = null;
  cancelSmoothScroll();
  document.body.style.overflow = "";
});

function onResize(): void {
  scheduleLayoutMetrics();
}

const len = computed(() => props.slides.length);

/** Horizontal scroll is possible (then we show arrows / screen dots). */
const trackOverflowsHorizontally = ref(false);

const showNav = computed(
  () => len.value > 1 && trackOverflowsHorizontally.value,
);

const screenCount = computed(() => screenScrollTargets.value.length);

const showScreenPager = computed(
  () => showNav.value && screenCount.value > 1,
);

let stateUpdateRaf: number | null = null;
function onScrollThrottled(): void {
  if (stateUpdateRaf !== null) {
    cancelAnimationFrame(stateUpdateRaf);
  }
  stateUpdateRaf = requestAnimationFrame(() => {
    stateUpdateRaf = null;
    updateScrollState();
  });
}

const SMOOTH_SCROLL_MS = 480;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

let smoothScrollAnimId: number | null = null;
function cancelSmoothScroll(): void {
  if (smoothScrollAnimId !== null) {
    cancelAnimationFrame(smoothScrollAnimId);
    smoothScrollAnimId = null;
  }
}

/**
 * Renders a visible ease; native `scroll-behavior: smooth` / `scrollBy({ behavior })`
 * is often a single step in tests and can feel instant or janky in some browsers.
 */
function smoothScrollToTarget(targetLeft: number): void {
  const sc = scrollerRef.value;
  /* v8 ignore next 1 */
  if (!sc) return;
  const max = Math.max(0, sc.scrollWidth - sc.clientWidth);
  const target = Math.max(0, Math.min(targetLeft, max));
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    sc.scrollLeft = target;
    updateScrollState();
    return;
  }
  cancelSmoothScroll();
  const start = sc.scrollLeft;
  const change = target - start;
  if (Math.abs(change) < 0.5) {
    return;
  }
  const t0 = performance.now();
  const step = (now: number): void => {
    if (!scrollerRef.value) {
      smoothScrollAnimId = null;
      return;
    }
    const rawT = (now - t0) / SMOOTH_SCROLL_MS;
    const t = Math.max(0, Math.min(1, rawT));
    sc.scrollLeft = start + change * easeInOutCubic(t);
    if (t < 1) {
      smoothScrollAnimId = requestAnimationFrame(step);
    } else {
      sc.scrollLeft = target;
      updateScrollState();
      smoothScrollAnimId = null;
    }
  };
  smoothScrollAnimId = requestAnimationFrame(step);
}

function getScrollStepPx(): number {
  const sc = scrollerRef.value;
  /* v8 ignore next 3 -- defensive: goPrev/Next only run when mounted */
  if (!sc) {
    return 120;
  }
  const first = sc.querySelector<HTMLElement>(
    '[data-testid="carousel-slide"]',
  );
  /* v8 ignore next 3 -- template always renders slides when the scroller exists */
  if (!first) {
    return Math.max(80, sc.clientWidth * 0.35);
  }
  const st = getComputedStyle(sc);
  const gap = Number.parseFloat(st.gap || st.columnGap || "12") || 12;
  return first.getBoundingClientRect().width + gap;
}

function buildScreenScrollTargets(max: number, stepPx: number): number[] {
  const s = Math.max(stepPx, 1);
  if (max < 0.5) {
    return [0];
  }
  const targets: number[] = [0];
  let pos = 0;
  while (pos + s < max - 0.5) {
    pos += s;
    targets.push(pos);
  }
  const last = targets[targets.length - 1]!;
  if (last < max - 0.5) {
    targets.push(max);
  }
  return targets;
}

function nearestScreenIndex(scrollLeft: number, targets: number[]): number {
  /* v8 ignore next 3 -- buildScreenScrollTargets always yields at least [0] */
  if (targets.length === 0) {
    return 0;
  }
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < targets.length; i++) {
    const d = Math.abs(scrollLeft - targets[i]!);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function updateScrollState(): void {
  const sc = scrollerRef.value;
  /* v8 ignore start -- defensive: public handlers only use the scroller when mounted */
  if (!sc) {
    canGoPrev.value = false;
    canGoNext.value = false;
    screenScrollTargets.value = [0];
    activeScreenIndex.value = 0;
    trackOverflowsHorizontally.value = false;
    return;
  }
  /* v8 ignore stop */
  const { scrollLeft, clientWidth, scrollWidth } = sc;
  trackOverflowsHorizontally.value = scrollWidth > clientWidth + 2;
  const max = Math.max(0, scrollWidth - clientWidth);
  canGoPrev.value = scrollLeft > 2;
  canGoNext.value = scrollLeft < max - 2;

  const step = getScrollStepPx() || 1;
  const targets = buildScreenScrollTargets(max, step);
  screenScrollTargets.value = targets;
  activeScreenIndex.value = nearestScreenIndex(scrollLeft, targets);
}

/**
 * Inner width available for slides in the narrow (`max-w-7xl`) strip, matches viewport padding
 * (`px-6` / `md:px-12`). If total `scrollWidth` fits here, we stay narrow (left-aligned, no arrows).
 * Otherwise we switch to the wide strip (`max-w-[min(100vw,105rem)]`); arrows appear only when the
 * track still overflows after layout (`scrollWidth > clientWidth`).
 */
const OUTER_MAX_NARROW_REM = 80;
const SCROLL_LAYOUT_EPS_PX = 2;

function pxFromRem(rem: number): number {
  const fs =
    typeof document !== "undefined"
      ? Number.parseFloat(getComputedStyle(document.documentElement).fontSize) ||
        16
      : 16;
  return rem * fs;
}

function narrowScrollerInnerPx(): number {
  const vw =
    typeof window !== "undefined"
      ? window.innerWidth
      : pxFromRem(OUTER_MAX_NARROW_REM);
  const outer = Math.min(vw, pxFromRem(OUTER_MAX_NARROW_REM));
  const padEach = vw >= 768 ? pxFromRem(3) : pxFromRem(1.5);
  return Math.max(0, outer - 2 * padEach);
}

type WidthTier = "narrow" | "wide";

const widthTier = ref<WidthTier>("narrow");

let carouselResizeObserver: ResizeObserver | null = null;

function resolveWidthTier(scrollW: number): WidthTier {
  if (scrollW <= narrowScrollerInnerPx() + SCROLL_LAYOUT_EPS_PX) {
    return "narrow";
  }
  return "wide";
}

const carouselViewportWidthClass = computed(() => {
  if (widthTier.value === "narrow") {
    return "mx-auto w-full max-w-7xl px-6 md:px-12";
  }
  return "mx-auto w-full max-w-[min(100vw,105rem)] px-4 sm:px-6 md:px-8 lg:px-12";
});

/** Wide viewport but nothing scrolls. Center carousel row so empty space isn’t all on one side. */
const centerCarouselRowWhenWideNoOverflow = computed(
  () => widthTier.value === "wide" && !trackOverflowsHorizontally.value,
);

function applyLayoutMetrics(): void {
  const sc = scrollerRef.value;
  if (!sc) {
    return;
  }
  widthTier.value = resolveWidthTier(sc.scrollWidth);
  void nextTick(() => {
    updateScrollState();
  });
}

function scheduleLayoutMetrics(): void {
  void nextTick(() => {
    applyLayoutMetrics();
  });
}

watch(
  () => props.slides,
  () => {
    const idx = lightboxIndex.value;
    if (
      idx !== null &&
      (idx >= props.slides.length || props.slides[idx] === undefined)
    ) {
      closeLightbox();
    }
    void nextTick(() => {
      if (scrollerRef.value) {
        scrollerRef.value.scrollTo({ left: 0, behavior: "auto" });
      }
      scheduleLayoutMetrics();
    });
  },
  { deep: true },
);

watch(lightboxIndex, (idx) => {
  document.body.style.overflow = idx !== null ? "hidden" : "";
});

function goToScreen(index: number): void {
  const targets = screenScrollTargets.value;
  /* v8 ignore next 3 -- dots only call with in-range indices */
  if (index < 0 || index >= targets.length) {
    return;
  }
  const target = targets[index];
  /* v8 ignore next 3 -- bounded index implies a real array element */
  if (target === undefined) {
    return;
  }
  smoothScrollToTarget(target);
}

function goPrev(): void {
  const sc = scrollerRef.value;
  if (!sc) return;
  smoothScrollToTarget(sc.scrollLeft - getScrollStepPx());
}

function goNext(): void {
  const sc = scrollerRef.value;
  if (!sc) return;
  smoothScrollToTarget(sc.scrollLeft + getScrollStepPx());
}
</script>

<style scoped>
/**
 * Fixed band height `--slide-h`; each image uses that height and `width: auto` so aspect ratio
 * matches the file. Slide width follows intrinsic dimensions (`flex: 0 0 auto`).
 */
.carousel-track {
  --g: 0.75rem;
}

@media (min-width: 768px) {
  .carousel-track {
    --g: 1rem;
  }
}

.carousel-track[data-band="compact"] {
  --slide-h: min(42vh, 22rem);
  min-height: var(--slide-h);
}

@media (min-width: 768px) {
  .carousel-track[data-band="compact"] {
    --slide-h: min(48vh, 25rem);
    min-height: var(--slide-h);
  }
}

.carousel-track[data-band="comfort"] {
  --slide-h: min(46vh, 24rem);
  min-height: var(--slide-h);
}

@media (min-width: 768px) {
  .carousel-track[data-band="comfort"] {
    --slide-h: min(52vh, 27rem);
    min-height: var(--slide-h);
  }
}

.carousel-slide {
  box-sizing: border-box;
  display: flex;
  flex: 0 0 auto;
  height: var(--slide-h);
  align-items: stretch;
}

.carousel-img-trigger {
  box-sizing: border-box;
  display: block;
  height: var(--slide-h);
  width: fit-content;
  max-width: none;
  padding: 0;
}

.carousel-img {
  display: block;
  box-sizing: border-box;
  height: var(--slide-h);
  width: auto;
  max-height: var(--slide-h);
}
</style>
