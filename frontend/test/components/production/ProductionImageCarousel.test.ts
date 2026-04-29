import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import { nextTick } from "vue";
import ProductionImageCarousel from "@/components/production/ProductionImageCarousel.vue";

const i18n = createI18n({
  legacy: false,
  locale: "en",
  messages: {
    en: {
      production: {
        gallery: {
          title: "Images",
          intro: "Intro",
          prev: "Previous",
          next: "Next",
          goToScreen: "Go to screen {n} of {total}",
          screenDotsGroupLabel: "Dots",
          carouselLabel: "Gallery",
          carouselRegion: "carousel",
          openLightbox: "View larger",
          lightboxTitle: "Enlarged image",
          closeLightbox: "Close enlarged image",
        },
      },
    },
  },
});

const slides4 = [
  { src: "/a.jpg", alt: "A" },
  { src: "/b.jpg", alt: "B" },
  { src: "/c.jpg", alt: "C" },
  { src: "/d.jpg", alt: "D" },
];

function ensureScrollToPolyfill(): void {
  if (typeof HTMLElement.prototype.scrollTo === "function") {
    return;
  }
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    value: function scrollTo(
      this: HTMLElement,
      opts?: { left?: number; top?: number; behavior?: string },
    ) {
      if (opts && typeof opts.left === "number") {
        this.scrollLeft = opts.left;
      }
    },
    configurable: true,
    writable: true,
  });
}

function mountAtWidth(slides: typeof slides4, innerWidth: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    get: () => innerWidth,
  });
  return mount(ProductionImageCarousel, {
    props: { slides },
    global: { plugins: [i18n] },
  });
}

/**
 * Rigs flex scroll metrics so next/prev and dots are meaningful in JSDOM.
 * Waits for the throttled scroll handler to run (rAF) so canGoNext / screen targets update.
 */
async function wireScroller(wrapper: ReturnType<typeof mount>) {
  const sc = wrapper.get(".overflow-x-auto").element as HTMLElement;
  let scrollLeft = 0;
  Object.defineProperty(sc, "clientWidth", { value: 200, configurable: true });
  Object.defineProperty(sc, "scrollWidth", { value: 2000, configurable: true });
  Object.defineProperty(sc, "scrollLeft", {
    get: () => scrollLeft,
    set: (v: number) => {
      scrollLeft = v;
    },
    configurable: true,
  });
  sc.dispatchEvent(new Event("scroll"));
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
  await nextTick();
  return { getScroll: () => scrollLeft, sc };
}

describe("ProductionImageCarousel.vue", () => {
  beforeEach(() => {
    ensureScrollToPolyfill();
    // JSDOM: prefer reduced motion so goNext/Prev sets scrollLeft in one turn.
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      matches: String(query).includes("prefers-reduced-motion"),
      media: String(query),
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders all slide images in the scroll track", () => {
    const wrapper = mountAtWidth(slides4, 1280);
    expect(wrapper.findAll("img").length).toBe(4);
  });

  it("moves the scroller when Next is used (reduced motion)", async () => {
    const wrapper = mountAtWidth(slides4, 1280);
    await nextTick();
    const { getScroll } = await wireScroller(wrapper);
    expect(getScroll()).toBe(0);
    await wrapper.get("button[aria-label='Next']").trigger("click");
    await nextTick();
    expect(getScroll()).toBeGreaterThan(0);
  });

  it("renders no region when there are no slides", () => {
    const wrapper = mount(ProductionImageCarousel, {
      props: { slides: [] },
      global: { plugins: [i18n] },
    });
    expect(wrapper.find('[role="region"]').exists()).toBe(false);
  });

  it("hides prev/next for a single slide", () => {
    const wrapper = mountAtWidth([slides4[0]!], 1280);
    expect(wrapper.findAll('button[aria-label="Previous"]')).toHaveLength(0);
    expect(wrapper.findAll('button[aria-label="Next"]')).toHaveLength(0);
    expect(wrapper.find('[data-testid="carousel-img-trigger"]').exists()).toBe(true);
    expect(wrapper.get("[data-testid=carousel-slide]").classes()).toContain(
      "carousel-slide",
    );
  });

  it("renders two slides with shared carousel-slide class", () => {
    const wrapper = mountAtWidth([slides4[0]!, slides4[1]!], 1280);
    const slides = wrapper.findAll("[data-testid=carousel-slide]");
    expect(slides).toHaveLength(2);
    for (const s of slides) {
      expect(s.classes()).toContain("carousel-slide");
    }
  });

  it("uses carousel-slide for each image when several slides are shown", () => {
    const wrapper = mountAtWidth(slides4, 1280);
    for (const s of wrapper.findAll("[data-testid=carousel-slide]")) {
      expect(s.classes()).toContain("carousel-slide");
    }
  });

  it("does not center the track for a single slide (narrow tier stays left-aligned)", () => {
    const wrapper = mountAtWidth([slides4[0]!], 1280);
    const cls = wrapper.get(".overflow-x-auto").classes().join(" ");
    expect(cls).not.toContain("justify-center");
  });

  it("treats exactly three slides like the 3+ layout branch", () => {
    const three = slides4.slice(0, 3);
    const wrapper = mountAtWidth(three, 1280);
    expect(wrapper.findAll("[data-testid=carousel-slide]")).toHaveLength(3);
    const track = wrapper.get(".overflow-x-auto");
    expect(track.attributes("data-band")).toBe("compact");
  });

  it("moves the scroller on ArrowRight and ArrowLeft (reduced motion)", async () => {
    const wrapper = mountAtWidth(slides4, 1280);
    await nextTick();
    const { getScroll, sc } = await wireScroller(wrapper);
    const region = wrapper.get('[role="region"]');
    (region.element as HTMLElement).focus();
    await region.trigger("keydown", { key: "ArrowRight" });
    await nextTick();
    const afterRight = getScroll();
    expect(afterRight).toBeGreaterThan(0);
    sc.scrollLeft = 400;
    sc.dispatchEvent(new Event("scroll"));
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    await nextTick();
    await region.trigger("keydown", { key: "ArrowLeft" });
    await nextTick();
    expect(getScroll()).toBeLessThan(400);
  });

  it("decrements scroll on Previous after Next (reduced motion)", async () => {
    const wrapper = mountAtWidth(slides4, 1280);
    await nextTick();
    const { getScroll } = await wireScroller(wrapper);
    await wrapper.get("button[aria-label='Next']").trigger("click");
    await nextTick();
    const afterNext = getScroll();
    expect(afterNext).toBeGreaterThan(0);
    await wrapper.get("button[aria-label='Previous']").trigger("click");
    await nextTick();
    expect(getScroll()).toBeLessThan(afterNext);
  });

  it("recomputes layout on window resize", async () => {
    const wrapper = mountAtWidth(slides4, 1280);
    await nextTick();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      get: () => 500,
    });
    window.dispatchEvent(new Event("resize"));
    await nextTick();
    expect(wrapper.findAll("img").length).toBe(4);
  });

  it("jumps when a screen dot is used", async () => {
    const wrapper = mountAtWidth(slides4, 1280);
    await nextTick();
    const { getScroll } = await wireScroller(wrapper);
    const dots = wrapper
      .findAll("button")
      .filter((b) => (b.element.getAttribute("aria-label") ?? "").startsWith("Go to screen"));
    expect(dots.length).toBeGreaterThan(1);
    await dots[1]!.trigger("click");
    await nextTick();
    expect(getScroll()).toBeGreaterThan(0);
    await dots[dots.length - 1]!.trigger("click");
    await nextTick();
    expect(getScroll()).toBeGreaterThan(0);
  });

  it("coalesces rapid scroll events (throttle cancel branch)", async () => {
    const wrapper = mountAtWidth(slides4, 1280);
    await nextTick();
    const { sc } = await wireScroller(wrapper);
    for (let i = 0; i < 5; i++) {
      sc.dispatchEvent(new Event("scroll"));
    }
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    await nextTick();
    expect(wrapper.findAll("img").length).toBe(4);
  });

  it("uses a single scroll target when the track is not scrollable (max=0)", async () => {
    const wrapper = mountAtWidth(slides4, 1280);
    await nextTick();
    const sc = wrapper.get(".overflow-x-auto").element as HTMLElement;
    let scrollLeft = 0;
    Object.defineProperty(sc, "clientWidth", { value: 2000, configurable: true });
    Object.defineProperty(sc, "scrollWidth", { value: 2000, configurable: true });
    Object.defineProperty(sc, "scrollLeft", {
      get: () => scrollLeft,
      set: (v: number) => {
        scrollLeft = v;
      },
      configurable: true,
    });
    sc.dispatchEvent(new Event("scroll"));
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    await nextTick();
    expect(
      wrapper.findAll("button").filter((b) =>
        (b.element.getAttribute("aria-label") ?? "").startsWith("Go to screen"),
      ),
    ).toHaveLength(0);
  });

  it("no-ops next when already scrolled to the end", async () => {
    const wrapper = mountAtWidth(slides4, 1280);
    await nextTick();
    const { getScroll, sc } = await wireScroller(wrapper);
    const max = 2000 - 200;
    sc.scrollLeft = max;
    sc.dispatchEvent(new Event("scroll"));
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    await nextTick();
    const before = getScroll();
    wrapper
      .get("button[aria-label='Next']")
      .element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextTick();
    expect(getScroll()).toBe(before);
  });

  it("no-ops prev at scroll start (smoothScrollToTarget early return)", async () => {
    const wrapper = mountAtWidth(slides4, 1280);
    await nextTick();
    const { getScroll } = await wireScroller(wrapper);
    expect(getScroll()).toBe(0);
    wrapper
      .get("button[aria-label='Previous']")
      .element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextTick();
    expect(getScroll()).toBe(0);
  });

  it("unmounts without throwing", () => {
    const wrapper = mountAtWidth(slides4, 1280);
    wrapper.unmount();
  });

  it("resets on slides prop change", async () => {
    const two = slides4.slice(0, 2);
    const wrapper = mount(ProductionImageCarousel, {
      props: { slides: slides4 },
      global: { plugins: [i18n] },
    });
    await wrapper.setProps({ slides: two });
    await nextTick();
    expect(wrapper.findAll("img").length).toBe(2);
  });

  it("opens lightbox with enlarged image and closes via backdrop", async () => {
    const wrapper = mount(ProductionImageCarousel, {
      props: { slides: slides4 },
      global: { plugins: [i18n] },
      attachTo: document.body,
    });
    await wrapper.get('[data-testid="carousel-img-trigger"]').trigger("click");
    await nextTick();
    expect(document.querySelector('[data-testid="lightbox-image"]')).toBeTruthy();
    document
      .querySelector('[data-testid="lightbox-backdrop"]')!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextTick();
    expect(document.querySelector('[data-testid="lightbox-image"]')).toBeNull();
    wrapper.unmount();
  });

  it("closes lightbox on Escape", async () => {
    const wrapper = mount(ProductionImageCarousel, {
      props: { slides: slides4 },
      global: { plugins: [i18n] },
      attachTo: document.body,
    });
    await wrapper.get('[data-testid="carousel-img-trigger"]').trigger("click");
    await nextTick();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await nextTick();
    expect(document.querySelector('[data-testid="lightbox-image"]')).toBeNull();
    wrapper.unmount();
  });

  it("closes lightbox when clicking the close control", async () => {
    const wrapper = mount(ProductionImageCarousel, {
      props: { slides: slides4 },
      global: { plugins: [i18n] },
      attachTo: document.body,
    });
    await wrapper.get('[data-testid="carousel-img-trigger"]').trigger("click");
    await nextTick();
    document
      .querySelector('[data-testid="lightbox-close"]')!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextTick();
    expect(document.querySelector('[data-testid="lightbox-image"]')).toBeNull();
    wrapper.unmount();
  });
});

describe("ProductionImageCarousel.vue — full-motion ease (not reduced motion)", () => {
  beforeEach(() => {
    ensureScrollToPolyfill();
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      // Only the reduce query must be false so smoothScrollToTarget uses the rAF path.
      matches: !String(query).includes("reduce"),
      media: String(query),
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    vi.spyOn(performance, "now").mockReturnValue(0);
    vi.stubGlobal(
      "requestAnimationFrame",
      (cb: (n: number) => void) => {
        queueMicrotask(() => {
          cb(500);
        });
        return 1;
      },
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("applies smoothScrollToTarget when motion is not reduced", async () => {
    const wrapper = mountAtWidth(slides4, 1280);
    await nextTick();
    const { getScroll } = await wireScroller(wrapper);
    expect(getScroll()).toBe(0);
    await wrapper.get("button[aria-label='Next']").trigger("click");
    await nextTick();
    await Promise.resolve();
    await Promise.resolve();
    expect(getScroll()).toBeGreaterThan(0);
  });

  it("cancels a pending rAF from smooth scroll on unmount", async () => {
    const cancel = vi.fn();
    vi.stubGlobal("cancelAnimationFrame", cancel);
    const wrapper = mountAtWidth(slides4, 1280);
    await nextTick();
    await wireScroller(wrapper);
    let rafId = 0;
    vi.stubGlobal("requestAnimationFrame", () => {
      rafId += 1;
      return rafId;
    });
    await wrapper.get("button[aria-label='Next']").trigger("click");
    wrapper.unmount();
    expect(cancel).toHaveBeenCalled();
  });

  it("bails out of the ease step if the scroller unmounts before the next frame", async () => {
    const stepCallbacks: Array<(t: number) => void> = [];
    const wrapper = mountAtWidth(slides4, 1280);
    await nextTick();
    await wireScroller(wrapper);
    vi.stubGlobal("requestAnimationFrame", (cb: (t: number) => void) => {
      stepCallbacks.push(cb);
      return stepCallbacks.length;
    });
    await wrapper.get("button[aria-label='Next']").trigger("click");
    expect(stepCallbacks.length).toBe(1);
    wrapper.unmount();
    stepCallbacks[0]!(50);
  });
});
