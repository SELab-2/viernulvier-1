import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ProductionListCardSkeleton from "@/components/productions/ProductionListCardSkeleton.vue";

describe("ProductionListCardSkeleton.vue", () => {
  it("renders without errors", () => {
    const wrapper = mount(ProductionListCardSkeleton);
    expect(wrapper.exists()).toBe(true);
  });

  it("has the animate-pulse class for the loading animation", () => {
    const wrapper = mount(ProductionListCardSkeleton);
    expect(wrapper.find(".animate-pulse").exists()).toBe(true);
  });

  it("contains an aria-hidden thumbnail placeholder", () => {
    const wrapper = mount(ProductionListCardSkeleton);
    const thumbnail = wrapper.find('[aria-hidden="true"]');
    expect(thumbnail.exists()).toBe(true);
  });

  it("renders no meaningful text content", () => {
    const wrapper = mount(ProductionListCardSkeleton);
    expect(wrapper.text().trim()).toBe("");
  });
});
