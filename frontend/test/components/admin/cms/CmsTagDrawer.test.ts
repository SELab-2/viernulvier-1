import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "@/i18n";
import type { CmsTagGroup } from "@/services/cms";
import CmsTagDrawer from "@/components/admin/cms/CmsTagDrawer.vue";

function buildTagGroups(): CmsTagGroup[] {
  return [
    {
      tagTypeId: 2,
      label: "Themes",
      isGenre: false,
      tags: [
        { id: 11, label: "Family" },
        { id: 12, label: "Cabaret" },
      ],
    },
  ];
}

function mountDrawer(props: Partial<InstanceType<typeof CmsTagDrawer>["$props"]> = {}) {
  return mount(CmsTagDrawer, {
    props: {
      show: true,
      panel: {
        rowId: 1,
        label: "Test production",
        selectedTagIds: [11],
      },
      additionalTagGroups: buildTagGroups(),
      bulkCount: 2,
      saveError: null,
      isSaving: false,
      ...props,
    },
    global: {
      plugins: [i18n],
    },
  });
}

describe("CmsTagDrawer.vue", () => {
  it("does not render when hidden or panel is null", () => {
    const hidden = mountDrawer({ show: false });
    expect(hidden.find(".cms-side-panel").exists()).toBe(false);

    const noPanel = mountDrawer({ panel: null });
    expect(noPanel.find(".cms-side-panel").exists()).toBe(false);
  });

  it("renders groups and emits close/save actions", async () => {
    const wrapper = mountDrawer();

    expect(wrapper.text()).toContain("Test production");
    expect(wrapper.text()).toContain("Themes");
    expect(wrapper.text()).toContain("Family");
    expect(wrapper.text()).toContain("Cabaret");

    await wrapper.get(".cms-side-overlay").trigger("click");
    await wrapper.get(".cms-side-close").trigger("click");
    await wrapper.get(".cms-side-save").trigger("click");

    expect(wrapper.emitted("close")?.length).toBe(2);
    expect(wrapper.emitted("save")?.length).toBe(1);
  });

  it("shows conditional bulk and error messages", () => {
    const withBulk = mountDrawer({ bulkCount: 3 });
    expect(withBulk.text()).toContain(i18n.global.t("cms.panel.bulkNotice", { count: 3 }));

    const withoutBulk = mountDrawer({ bulkCount: 1 });
    expect(withoutBulk.text()).not.toContain(i18n.global.t("cms.panel.bulkNotice", { count: 1 }));

    const withError = mountDrawer({ saveError: "Failed to save tags" });
    expect(withError.text()).toContain("Failed to save tags");
  });

  it("emits toggle-tag with checked and unchecked payload", async () => {
    const wrapper = mountDrawer();

    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    await checkboxes[1]?.setValue(true);
    await checkboxes[0]?.setValue(false);

    expect(wrapper.emitted("toggle-tag")?.[0]).toEqual([12, true]);
    expect(wrapper.emitted("toggle-tag")?.[1]).toEqual([11, false]);
  });

  it("disables save button while saving", () => {
    const wrapper = mountDrawer({ isSaving: true });
    expect((wrapper.get(".cms-side-save").element as HTMLButtonElement).disabled).toBe(true);
  });
});
