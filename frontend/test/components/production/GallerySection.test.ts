import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import GallerySection from "@/components/production/GallerySection.vue";

describe("GallerySection", () => {
  it("renders without errors", () => {
    const wrapper = mount(GallerySection);
    expect(wrapper.exists()).toBe(true);
  });

  it("renders the section heading", () => {
    const wrapper = mount(GallerySection);
    expect(wrapper.text()).toContain("Gallery");
  });

  it("renders all 6 gallery images", () => {
    const wrapper = mount(GallerySection);
    expect(wrapper.findAll("img")).toHaveLength(6);
  });

  it("renders the View Catalog link", () => {
    const wrapper = mount(GallerySection);
    expect(wrapper.find("a").text()).toContain("View Catalog");
  });
});