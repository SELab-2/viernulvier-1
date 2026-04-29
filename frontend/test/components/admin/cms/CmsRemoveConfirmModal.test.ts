import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "@/i18n";
import CmsRemoveConfirmModal from "@/components/admin/cms/CmsRemoveConfirmModal.vue";

const baseProps = {
  isLoading: false,
  error: null as string | null,
  count: 3,
  titleKey: "cms.actions.tag.confirmRemoveDialogTitle",
  bodyKey: "cms.actions.tag.confirmRemoveBody",
};

function mountModal(propsOverride: Partial<typeof baseProps> = {}) {
  return mount(CmsRemoveConfirmModal, {
    props: { ...baseProps, ...propsOverride },
    global: { plugins: [i18n] },
  });
}

describe("CmsRemoveConfirmModal", () => {
  it("renders title and body via the supplied i18n keys with the count", () => {
    const wrapper = mountModal({ count: 7 });

    expect(wrapper.text()).toContain(i18n.global.t("cms.actions.tag.confirmRemoveDialogTitle"));
    expect(wrapper.text()).toContain("7");
  });

  it("shows the error banner when error is non-null", () => {
    const wrapper = mountModal({ error: "Something went wrong" });

    expect(wrapper.text()).toContain("Something went wrong");
  });

  it("emits close from the header close button", async () => {
    const wrapper = mountModal();

    await wrapper.findAll(".cms-side-close")[0].trigger("click");

    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("emits close from the cancel button in the footer", async () => {
    const wrapper = mountModal();

    const closeButtons = wrapper.findAll(".cms-side-close");
    await closeButtons[closeButtons.length - 1].trigger("click");

    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("emits close when the backdrop is clicked", async () => {
    const wrapper = mountModal();

    await wrapper.find(".cms-modal-overlay").trigger("click");

    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("emits confirm when the submit button is clicked", async () => {
    const wrapper = mountModal();

    await wrapper.find(".cms-side-save").trigger("click");

    expect(wrapper.emitted("confirm")).toBeTruthy();
  });

  it("disables both action buttons while loading", () => {
    const wrapper = mountModal({ isLoading: true });

    const closeButtons = wrapper.findAll(".cms-side-close");
    const cancel = closeButtons[closeButtons.length - 1];
    const submit = wrapper.find(".cms-side-save");

    expect(cancel.attributes("disabled")).toBeDefined();
    expect(submit.attributes("disabled")).toBeDefined();
  });

  it("swaps the submit label to the saving state while loading", () => {
    const wrapper = mountModal({ isLoading: true });

    expect(wrapper.find(".cms-side-save").text()).toBe(i18n.global.t("cms.panel.saving"));
  });
});
