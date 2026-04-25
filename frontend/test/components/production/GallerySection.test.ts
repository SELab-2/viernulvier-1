import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import GallerySection from "@/components/production/GallerySection.vue";
import { i18n } from "@/i18n";

beforeEach(() => {
  if (typeof HTMLElement.prototype.scrollTo !== "function") {
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
});

const sixSlides = Array.from({ length: 6 }, (_, i) => ({
  src: `/g${i}.jpg`,
  alt: `Image ${i + 1}`,
}));

function mountGallery() {
  return mount(GallerySection, {
    props: { slides: sixSlides },
    global: { plugins: [i18n] },
  });
}

describe("GallerySection", () => {
  it("renders without errors", () => {
    const wrapper = mountGallery();
    expect(wrapper.exists()).toBe(true);
  });

  it("renders the section heading (nl copy)", () => {
    const wrapper = mountGallery();
    expect(wrapper.text()).toContain("Beelden");
  });

  it("renders all 6 gallery images", () => {
    const wrapper = mountGallery();
    expect(wrapper.findAll("img")).toHaveLength(6);
  });

  it("renders the intro line from i18n", () => {
    const wrapper = mountGallery();
    expect(wrapper.text()).toContain("mediarchief");
  });

  it("renders no section when there are no slides", () => {
    const wrapper = mount(GallerySection, {
      props: { slides: [] },
      global: { plugins: [i18n] },
    });
    expect(wrapper.find("section").exists()).toBe(false);
  });
});