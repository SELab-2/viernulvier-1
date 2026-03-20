import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import CMSView from "@/views/admin/CMSView.vue";

describe("CMSView.vue", () => {
  it("renders without errors", () => {
    const wrapper = mount(CMSView);
    expect(wrapper.exists()).toBe(true);
  });

  it("renders the productions text", () => {
    const wrapper = mount(CMSView);
    expect(wrapper.text()).toContain("CMS (admin only)");
  });
});
