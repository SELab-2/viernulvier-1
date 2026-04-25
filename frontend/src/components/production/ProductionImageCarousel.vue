<template>
  <div
    v-if="slides.length > 0"
    class="relative outline-none focus-visible:ring-2 focus-visible:ring-accent-outline focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0"
    role="region"
    tabindex="0"
    :aria-label="t('production.gallery.carouselLabel')"
    :aria-roledescription="t('production.gallery.carouselRegion')"
    @keydown.left.prevent="goPrev"
    @keydown.right.prevent="goNext"
  >
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
        :class="[
          'carousel-track flex gap-3 overflow-x-auto overflow-y-hidden bg-black py-1 md:gap-4',
          hideScrollbarClass,
          slides.length >= 3
            ? 'min-h-[min(34vh,17rem)] md:min-h-[min(40vh,20rem)]'
            : 'min-h-[min(44vh,22rem)] md:min-h-[min(52vh,26rem)]',
        ]"
        @scroll="onScrollThrottled"
      >
        <div
          v-for="(item, i) in slides"
          :key="`${i}-${item.src}`"
          data-testid="carousel-slide"
          :class="['carousel-slide', slideSizeClass]"
        >
          <img
            :src="item.src"
            :alt="item.alt"
            :class="[
              'carousel-img w-full object-contain',
              slides.length >= 3
                ? 'max-h-[min(46vh,24rem)] md:max-h-[min(54vh,28rem)]'
                : 'max-h-[min(50vh,26rem)] md:max-h-[min(58vh,30rem)]',
            ]"
            loading="lazy"
            decoding="async"
            referrerpolicy="no-referrer"
          />
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
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
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

const scrollerRef = ref<HTMLElement | null>(null);
const canGoPrev = ref(false);
const canGoNext = ref(false);
/** Scroll positions for each “screen” (same steps as prev/next, last = max). */
const screenScrollTargets = ref<number[]>([0]);
const activeScreenIndex = ref(0);
/** Desktop: 2.5 across; tablet: ~1.5; phone: ~1.2 (peek) */
const widthMode = ref<"multi-peek" | "one-half" | "pair">("multi-peek");

const hideScrollbarClass =
  "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

function readWidthMode(): void {
  if (typeof window === "undefined") return;
  const w = window.innerWidth;
  if (w < 768) {
    widthMode.value = "one-half";
  } else if (w < 1024) {
    widthMode.value = "pair";
  } else {
    widthMode.value = "multi-peek";
  }
}

onMounted(() => {
  readWidthMode();
  window.addEventListener("resize", onResize);
  void nextTick(() => {
    updateScrollState();
  });
});
onUnmounted(() => {
  window.removeEventListener("resize", onResize);
  cancelSmoothScroll();
});

function onResize(): void {
  readWidthMode();
  void nextTick(() => {
    updateScrollState();
  });
}

const len = computed(() => props.slides.length);

/**
 * Widths live in scoped CSS: Tailwind `calc(100%-2rem)` is invalid in CSS
 * (operators in calc need spaces), so old rules were dropped; flex then used
 * min-width: auto and image intrinsic width — only ~1 slide visible.
 */
const slideSizeClass = computed(() => {
  const n = len.value;
  if (n === 0) {
    return "";
  }
  if (n === 1) {
    return "carousel-slide--single";
  }
  if (n === 2) {
    return "carousel-slide--pair";
  }
  if (n >= 3) {
    if (widthMode.value === "multi-peek") {
      return "carousel-slide--multi-peek";
    }
    if (widthMode.value === "pair") {
      return "carousel-slide--tablet-peek";
    }
    return "carousel-slide--mobile-peek";
  }
  return "";
});

const showNav = computed(() => len.value > 1);

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
    return;
  }
  /* v8 ignore stop */
  const { scrollLeft, clientWidth, scrollWidth } = sc;
  const max = Math.max(0, scrollWidth - clientWidth);
  canGoPrev.value = scrollLeft > 2;
  canGoNext.value = scrollLeft < max - 2;

  const step = getScrollStepPx() || 1;
  const targets = buildScreenScrollTargets(max, step);
  screenScrollTargets.value = targets;
  activeScreenIndex.value = nearestScreenIndex(scrollLeft, targets);
}

watch(
  () => props.slides,
  () => {
    void nextTick(() => {
      if (scrollerRef.value) {
        scrollerRef.value.scrollTo({ left: 0, behavior: "auto" });
      }
      updateScrollState();
    });
  },
  { deep: true },
);

watch(
  [widthMode, len],
  () => {
    void nextTick(() => {
      if (scrollerRef.value) {
        scrollerRef.value.scrollTo({ left: 0, behavior: "auto" });
      }
      updateScrollState();
    });
  },
  { immediate: true },
);

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
 * 100% = scroll track (flex container) width. `calc(100% - x)` must use spaces
 * around `-` or the declaration is invalid in browsers.
 * --g matches .gap-3 (0.75rem) and md:.gap-4 (1rem).
 */
.carousel-track {
  --g: 0.75rem;
}

@media (min-width: 768px) {
  .carousel-track {
    --g: 1rem;
  }
}

.carousel-slide {
  box-sizing: border-box;
  display: flex;
  min-width: 0;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
}

.carousel-img {
  height: auto;
  max-width: 100%;
}

/* Single image: full width of track */
.carousel-slide--single {
  width: 100%;
  flex: 0 0 100%;
}

/* Two images: 50% minus half the single gap */
.carousel-slide--pair {
  flex: 0 0 calc((100% - var(--g)) * 0.5);
  width: calc((100% - var(--g)) * 0.5);
}

/* 3+ on large: ~2.5 across — 2.5 * slide + 2 * gap = 100% */
.carousel-slide--multi-peek {
  flex: 0 0 calc((100% - 2 * var(--g)) / 2.5);
  width: calc((100% - 2 * var(--g)) / 2.5);
}

/* Tablet: ~1.5 visible */
.carousel-slide--tablet-peek {
  flex: 0 0 calc((100% - var(--g)) / 1.5);
  width: calc((100% - var(--g)) / 1.5);
}

/* Narrow phone: more peek, smaller tiles */
.carousel-slide--mobile-peek {
  flex: 0 0 calc((100% - var(--g)) / 1.2);
  width: calc((100% - var(--g)) / 1.2);
}
</style>
