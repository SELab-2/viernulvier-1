import { describe, it, expect, beforeEach, vi } from "vitest";
import { defineComponent, nextTick, ref } from "vue";
import { mount } from "@vue/test-utils";
import { useFittingPills } from "@/composables/useFittingPills";

type Pill = { id: number; label: string };

function makeItems(count: number): Pill[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    label: `Pill ${i + 1}`,
  }));
}

function setDim(el: HTMLElement, dims: { offsetWidth?: number; clientWidth?: number }) {
  if (dims.offsetWidth !== undefined) {
    Object.defineProperty(el, "offsetWidth", {
      configurable: true,
      value: dims.offsetWidth,
    });
  }
  if (dims.clientWidth !== undefined) {
    Object.defineProperty(el, "clientWidth", {
      configurable: true,
      value: dims.clientWidth,
    });
  }
}

function mountComposable(
  initialItems: Pill[],
  options?: { gapPx?: number; trailingControlGapPx?: number; fallbackVisibleCount?: number },
) {
  const items = ref<Pill[]>(initialItems);
  let api!: ReturnType<typeof useFittingPills<Pill>>;

  mount(
    defineComponent({
      setup() {
        api = useFittingPills(items, options);
        return {};
      },
      template: "<div />",
    }),
  );

  return { items, api };
}

describe("useFittingPills", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows all items when no row element is set", () => {
    const { api } = mountComposable(makeItems(3));
    api.recomputeVisibleCount();
    expect(api.visibleItems.value.map((x) => x.id)).toEqual([1, 2, 3]);
  });

  it("uses fallback visible count when available width is zero/negative", () => {
    const { api } = mountComposable(makeItems(4), { fallbackVisibleCount: 2, trailingControlGapPx: 12 });
    const row = document.createElement("div");
    const trailing = document.createElement("button");
    setDim(row, { clientWidth: 20 });
    setDim(trailing, { offsetWidth: 16 });
    api.setRowRef(row);
    api.setTrailingControlRef(trailing);
    api.recomputeVisibleCount();
    expect(api.visibleItems.value.map((x) => x.id)).toEqual([1, 2]);
  });

  it("uses fallback when no measurable pill widths are available", () => {
    const { api } = mountComposable(makeItems(3), { fallbackVisibleCount: 1 });
    const row = document.createElement("div");
    setDim(row, { clientWidth: 200 });
    api.setRowRef(row);
    for (const item of makeItems(3)) {
      const pill = document.createElement("button");
      setDim(pill, { offsetWidth: 0 });
      api.setPillRef(item.id, pill);
    }
    api.recomputeVisibleCount();
    expect(api.visibleItems.value.map((x) => x.id)).toEqual([1]);
  });

  it("fits pills by row width and gap, skipping missing pill refs", () => {
    const { api } = mountComposable(makeItems(3), { gapPx: 8 });
    const row = document.createElement("div");
    setDim(row, { clientWidth: 100 });
    api.setRowRef(row);

    const pill1 = document.createElement("button");
    const pill3 = document.createElement("button");
    setDim(pill1, { offsetWidth: 30 });
    setDim(pill3, { offsetWidth: 30 });
    api.setPillRef(1, pill1);
    // pill id 2 intentionally not set -> continues in loop
    api.setPillRef(3, pill3);

    api.recomputeVisibleCount();
    expect(api.visibleItems.value.map((x) => x.id)).toEqual([1, 2]);
  });

  it("removes pill refs when element becomes null", () => {
    const { api } = mountComposable(makeItems(2), { fallbackVisibleCount: 0 });
    const row = document.createElement("div");
    setDim(row, { clientWidth: 100 });
    api.setRowRef(row);

    const pill1 = document.createElement("button");
    setDim(pill1, { offsetWidth: 40 });
    api.setPillRef(1, pill1);
    api.recomputeVisibleCount();
    expect(api.visibleItems.value.length).toBe(1);

    api.setPillRef(1, null);
    api.recomputeVisibleCount();
    expect(api.visibleItems.value.length).toBe(0);
  });

  it("accepts component refs ($el) and recomputes on items watch", async () => {
    const { items, api } = mountComposable(makeItems(2), { fallbackVisibleCount: 1 });
    const row = document.createElement("div");
    setDim(row, { clientWidth: 120 });
    api.setRowRef(row);

    for (const item of items.value) {
      const pill = document.createElement("button");
      setDim(pill, { offsetWidth: 40 });
      api.setPillRef(item.id, { $el: pill } as unknown as never);
    }
    api.recomputeVisibleCount();
    expect(api.visibleItems.value.map((x) => x.id)).toEqual([1, 2]);

    items.value = makeItems(1);
    await nextTick();
    await nextTick();
    expect(api.visibleItems.value.map((x) => x.id)).toEqual([1]);
  });

  it("wires ResizeObserver + resize listener and cleans up on unmount", async () => {
    const observe = vi.fn();
    const unobserve = vi.fn();
    const disconnect = vi.fn();
    let roCallback: ResizeObserverCallback | null = null;

    class ResizeObserverMock {
      constructor(cb: ResizeObserverCallback) {
        roCallback = cb;
      }
      observe = observe;
      unobserve = unobserve;
      disconnect = disconnect;
    }

    vi.stubGlobal("ResizeObserver", ResizeObserverMock as unknown as typeof ResizeObserver);
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const items = ref(makeItems(2));
    let api!: ReturnType<typeof useFittingPills<Pill>>;
    const wrapper = mount(
      defineComponent({
        setup() {
          api = useFittingPills(items);
          return {};
        },
        template: "<div />",
      }),
    );

    const rowA = document.createElement("div");
    const rowB = document.createElement("div");
    setDim(rowA, { clientWidth: 100 });
    setDim(rowB, { clientWidth: 100 });

    const p1 = document.createElement("button");
    const p2 = document.createElement("button");
    setDim(p1, { offsetWidth: 30 });
    setDim(p2, { offsetWidth: 30 });
    api.setPillRef(1, p1);
    api.setPillRef(2, p2);

    api.setRowRef(rowA);
    await nextTick();
    await nextTick();
    expect(observe).toHaveBeenCalledWith(rowA);

    api.setRowRef(rowB);
    await nextTick();
    await nextTick();
    expect(unobserve).toHaveBeenCalledWith(rowA);
    expect(observe).toHaveBeenCalledWith(rowB);

    setDim(rowB, { clientWidth: 40 });
    (roCallback as ResizeObserverCallback | null)?.([], {} as ResizeObserver);
    expect(api.visibleItems.value.length).toBe(1);

    setDim(rowB, { clientWidth: 120 });
    window.dispatchEvent(new Event("resize"));
    expect(api.visibleItems.value.length).toBe(2);

    wrapper.unmount();
    expect(disconnect).toHaveBeenCalled();
    expect(addSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});

