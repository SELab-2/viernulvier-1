import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "@/i18n";
import CmsGridControls from "@/components/admin/cms/CmsGridControls.vue";

describe("CmsGridControls", () => {
  function mountControls(columnChooserOpen = false) {
    return mount(CmsGridControls, {
      props: {
        quickFilterText: "",
        selectedCount: 2,
        columnChooserOpen,
      },
      global: {
        plugins: [i18n],
      },
    });
  }

  it("emits quick filter update and apply events on input", async () => {
    const wrapper = mountControls(false);
    await wrapper.get(".cms-search-input").setValue("needle");

    expect(wrapper.emitted("update:quickFilterText")?.[0]).toEqual(["needle"]);
    expect(wrapper.emitted("apply-quick-filter")?.length).toBe(1);
  });

  it("emits all toolbar action events", async () => {
    const wrapper = mountControls(false);
    const buttons = wrapper.findAll(".cms-grid-actions .cms-mini-btn");

    for (const button of buttons) {
      await button.trigger("click");
    }

    expect(wrapper.emitted("fit-columns")?.length).toBe(1);
    expect(wrapper.emitted("auto-size-columns")?.length).toBe(1);
    expect(wrapper.emitted("reset-filters")?.length).toBe(1);
    expect(wrapper.emitted("export-csv")?.length).toBe(1);
    expect(wrapper.emitted("reset-state")?.length).toBe(1);
    expect(wrapper.emitted("toggle-columns")?.length).toBe(1);
  });

  it("renders different columns button label when chooser is open", () => {
    const closed = mountControls(false);
    expect(closed.text()).toContain(i18n.global.t("cms.actions.columns"));

    const open = mountControls(true);
    expect(open.text()).toContain(i18n.global.t("cms.actions.hideColumns"));
  });
});
