import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "@/i18n";
import CmsTagsTab from "@/components/admin/cms/CmsTagsTab.vue";

describe("CmsTagsTab", () => {
  it("renders the placeholder message", () => {
    const wrapper = mount(CmsTagsTab, {
      global: { plugins: [i18n] },
    });
    expect(wrapper.text()).toMatch(/tag/i);
    expect(wrapper.find(".cms-tab-placeholder").exists()).toBe(true);
  });
});
