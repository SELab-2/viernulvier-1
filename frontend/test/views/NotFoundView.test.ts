import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import NotFoundView from "@/views/NotFoundView.vue";

describe("NotFoundView.vue", () => {
  it("renders without errors", () => {
    const wrapper = mount(NotFoundView);
    expect(wrapper.exists()).toBe(true);
  });

  it("renders the not found text", () => {
    const wrapper = mount(NotFoundView);
    expect(wrapper.text()).toContain("404 - Not found");
  });
});
