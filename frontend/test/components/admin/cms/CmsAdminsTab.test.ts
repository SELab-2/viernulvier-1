import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "@/i18n";
import CmsAdminsTab from "@/components/admin/cms/CmsAdminsTab.vue";

describe("CmsAdminsTab", () => {
  it("renders the placeholder message", () => {
    const wrapper = mount(CmsAdminsTab, {
      global: { plugins: [i18n] },
    });
    expect(wrapper.text()).toMatch(/admin/i);
    expect(wrapper.find(".cms-tab-placeholder").exists()).toBe(true);
  });
});
