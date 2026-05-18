import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ProductionsFilterSkeleton from "@/components/productions/ProductionsFilterSkeleton.vue";

describe("ProductionsFilterSkeleton.vue", () => {
  it("renders without errors", () => {
    const wrapper = mount(ProductionsFilterSkeleton);
    expect(wrapper.exists()).toBe(true);
  });

  it("has the animate-pulse class for the loading animation", () => {
    const wrapper = mount(ProductionsFilterSkeleton);
    expect(wrapper.find(".animate-pulse").exists()).toBe(true);
  });

  it("renders no meaningful text content", () => {
    const wrapper = mount(ProductionsFilterSkeleton);
    expect(wrapper.text().trim()).toBe("");
  });

  it("renders placeholder elements for both filter rows", () => {
    const wrapper = mount(ProductionsFilterSkeleton);.
    const rows = wrapper.find(".animate-pulse").findAll(":scope > div");
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });
});
