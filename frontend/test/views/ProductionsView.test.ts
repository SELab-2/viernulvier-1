import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ProductionsView from "@/views/ProductionsView.vue";

describe("ProductionsView.vue", () => {
  it("renders without errors", () => {
    const wrapper = mount(ProductionsView);
    expect(wrapper.exists()).toBe(true);
  });

  it("renders the productions text", () => {
    const wrapper = mount(ProductionsView);
    expect(wrapper.text()).toContain("Productions");
  });
});
