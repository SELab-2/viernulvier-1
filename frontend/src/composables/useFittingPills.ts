import {
  type ComponentPublicInstance,
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type ComputedRef,
  type Ref,
} from "vue";

type PillId = number | string;

type MaybeItemsRef<T> = Ref<readonly T[]> | ComputedRef<readonly T[]>;

interface UseFittingPillsOptions {
  gapPx?: number;
  /** Used only when widths are not measurable (e.g. JSDOM). */
  fallbackVisibleCount?: number;
}

/**
 * Computes how many pills can fit in one row, accounting for an optional trailing control
 */
export function useFittingPills<T extends { id: PillId }>(
  items: MaybeItemsRef<T>,
  options: UseFittingPillsOptions = {},
) {
  const gapPx = options.gapPx ?? 8;
  const fallbackVisibleCount = options.fallbackVisibleCount;

  const rowEl = ref<HTMLElement | null>(null);
  const trailingControlEl = ref<HTMLElement | null>(null);

  const visibleCount = ref(0);
  const pillElements = new Map<PillId, HTMLElement>();
  let rowResizeObserver: ResizeObserver | null = null;

  function resolveDomElement(
    el: Element | ComponentPublicInstance | null,
  ): HTMLElement | null {
    if (el instanceof HTMLElement) return el;
    if (
      el &&
      typeof el === "object" &&
      "$el" in el &&
      (el.$el as unknown) instanceof HTMLElement
    ) {
      return el.$el as HTMLElement;
    }
    return null;
  }

  function setPillRef(
    id: PillId,
    el: Element | ComponentPublicInstance | null,
  ): void {
    const domEl = resolveDomElement(el);
    if (domEl) {
      pillElements.set(id, domEl);
      return;
    }
    pillElements.delete(id);
  }

  function setRowRef(el: Element | ComponentPublicInstance | null): void {
    rowEl.value = resolveDomElement(el);
  }

  function setTrailingControlRef(
    el: Element | ComponentPublicInstance | null,
  ): void {
    trailingControlEl.value = resolveDomElement(el);
  }

  function computeFallbackCount(total: number): number {
    if (fallbackVisibleCount === undefined) return total;
    return Math.min(total, Math.max(0, fallbackVisibleCount));
  }

  function recomputeVisibleCount(): void {
    const all = items.value;
    const total = all.length;
    if (total === 0) {
      visibleCount.value = 0;
      return;
    }

    const row = rowEl.value;
    if (!row) {
      visibleCount.value = total;
      return;
    }

    const trailingWidth = trailingControlEl.value
      ? trailingControlEl.value.offsetWidth + gapPx
      : 0;
    const available = row.clientWidth - trailingWidth;
    if (available <= 0) {
      visibleCount.value = computeFallbackCount(total);
      return;
    }

    let used = 0;
    let fit = 0;
    let sawMeasurableWidth = false;

    for (const item of all) {
      const el = pillElements.get(item.id);
      if (!el) continue;
      const width = el.offsetWidth;
      if (width > 0) sawMeasurableWidth = true;
      const nextUsed = fit === 0 ? width : used + gapPx + width;
      if (nextUsed > available) break;
      used = nextUsed;
      fit += 1;
    }

    if (!sawMeasurableWidth) {
      visibleCount.value = computeFallbackCount(total);
      return;
    }
    visibleCount.value = fit;
  }

  const visibleItems = computed(() => items.value.slice(0, visibleCount.value));

  watch(
    items,
    async (next) => {
      visibleCount.value = Math.min(visibleCount.value, next.length);
      await nextTick();
      recomputeVisibleCount();
    },
    { deep: true },
  );

  watch(
    trailingControlEl,
    async () => {
      await nextTick();
      recomputeVisibleCount();
    },
    { flush: "post" },
  );

  watch(
    rowEl,
    async (next, prev) => {
      if (rowResizeObserver) {
        if (prev) rowResizeObserver.unobserve(prev);
        if (next) rowResizeObserver.observe(next);
      }
      await nextTick();
      recomputeVisibleCount();
    },
    { flush: "post" },
  );

  function onWindowResize(): void {
    recomputeVisibleCount();
  }

  onMounted(async () => {
    await nextTick();
    recomputeVisibleCount();

    if (typeof ResizeObserver !== "undefined") {
      rowResizeObserver = new ResizeObserver(() => {
        recomputeVisibleCount();
      });
      if (rowEl.value) rowResizeObserver.observe(rowEl.value);
    }
    window.addEventListener("resize", onWindowResize);
  });

  onUnmounted(() => {
    rowResizeObserver?.disconnect();
    rowResizeObserver = null;
    window.removeEventListener("resize", onWindowResize);
  });

  return {
    setRowRef,
    setTrailingControlRef,
    setPillRef,
    visibleItems,
    recomputeVisibleCount,
  };
}

