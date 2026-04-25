import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
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

describe("ProductionImageCarousel.vue", () => {
  beforeEach(() => {
    if (!("scrollTo" in HTMLElement.prototype)) {
      Object.defineProperty(HTMLElement.prototype, "scrollTo", {
        value: () => {},
        configurable: true,
        writable: true,
      });
    }
  });

  it("renders all slide images in the scroll track", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1280,
    });
    const wrapper = mount(ProductionImageCarousel, {
      props: { slides: slides4 },
      global: { plugins: [i18n] },
    });
    expect(wrapper.findAll("img").length).toBe(4);
  });

  it("moves the scroller when Next is used (eased frame animation)", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1280,
    });
    const wrapper = mount(ProductionImageCarousel, {
      props: { slides: slides4 },
      global: { plugins: [i18n] },
    });
    await wrapper.vm.$nextTick();
    const sc = wrapper.get(".overflow-x-auto").element as HTMLElement;
    let scrollLeft = 0;
    Object.defineProperty(sc, "clientWidth", { value: 400, configurable: true });
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

    expect(scrollLeft).toBe(0);
    await wrapper.get("button[aria-label='Next']").trigger("click");
    for (let i = 0; i < 80; i++) {
      if (scrollLeft > 0) {
        break;
      }
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
    }
    expect(scrollLeft).toBeGreaterThan(0);
  });
});
