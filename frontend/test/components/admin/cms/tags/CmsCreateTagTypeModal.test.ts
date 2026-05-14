import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "@/i18n";
import CmsCreateTagTypeModal from "@/components/admin/cms/tags/CmsCreateTagTypeModal.vue";

function mountModal(
  props: Partial<InstanceType<typeof CmsCreateTagTypeModal>["$props"]> = {},
) {
  return mount(CmsCreateTagTypeModal, {
    global: { plugins: [i18n] },
    props: {
      open: true,
      isCreating: false,
      error: null,
      ...props,
    },
  });
}

describe("CmsCreateTagTypeModal", () => {
  it("does not render when closed", () => {
    const wrapper = mountModal({ open: false });
    expect(wrapper.find(".cms-modal").exists()).toBe(false);
  });

  it("renders an NL input by default and hidden EN/FR pills", () => {
    const wrapper = mountModal();
    expect(wrapper.find('[data-testid="cms-create-tag-type-name-nl"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="cms-create-tag-type-name-en"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="cms-create-tag-type-name-fr"]').exists()).toBe(false);
  });

  it("toggles EN/FR language inputs via the pills", async () => {
    const wrapper = mountModal();
    const pills = wrapper.findAll(".cms-language-pill");
    await pills[1].trigger("click");
    expect(wrapper.find('[data-testid="cms-create-tag-type-name-en"]').exists()).toBe(true);
    await pills[2].trigger("click");
    expect(wrapper.find('[data-testid="cms-create-tag-type-name-fr"]').exists()).toBe(true);
  });

  it("pre-fills the initial name in NL when initialName is provided", async () => {
    const wrapper = mountModal({ initialName: "Workshop" });
    const input = wrapper.get('[data-testid="cms-create-tag-type-name-nl"]')
      .element as HTMLInputElement;
    expect(input.value).toBe("Workshop");
  });

  it("respects initialLang when prefilling", async () => {
    const wrapper = mountModal({ initialName: "Atelier", initialLang: "fr" });
    const pills = wrapper.findAll(".cms-language-pill");
    await pills[2].trigger("click");
    const input = wrapper.get('[data-testid="cms-create-tag-type-name-fr"]')
      .element as HTMLInputElement;
    expect(input.value).toBe("Atelier");
  });

  it("emits submit with a LanguageMap containing the filled languages", async () => {
    const wrapper = mountModal();
    await wrapper.get('[data-testid="cms-create-tag-type-name-nl"]').setValue("Concert");
    await wrapper.get('[data-testid="cms-create-tag-type-submit"]').trigger("click");
    const emitted = wrapper.emitted("submit");
    expect(emitted).toHaveLength(1);
    expect(emitted![0][0]).toEqual({ name: { nl: "Concert" } });
  });

  it("submit with no values still emits (parent validates)", async () => {
    const wrapper = mountModal();
    await wrapper.get('[data-testid="cms-create-tag-type-submit"]').trigger("click");
    expect(wrapper.emitted("submit")?.[0]).toEqual([{ name: {} }]);
  });

  it("disables the save button while creating", () => {
    const wrapper = mountModal({ isCreating: true });
    const btn = wrapper.get('[data-testid="cms-create-tag-type-submit"]')
      .element as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("renders the error message when provided", () => {
    const wrapper = mountModal({ error: "Already exists" });
    expect(wrapper.get('[data-testid="cms-create-tag-type-error"]').text()).toContain(
      "Already exists",
    );
  });

  it("emits close on overlay click, header close, and cancel button", async () => {
    const wrapper = mountModal();
    await wrapper.get(".cms-modal-overlay").trigger("click");
    await wrapper.get(".cms-modal-header .cms-side-close").trigger("click");
    await wrapper.get(".cms-modal-footer .cms-side-close").trigger("click");
    expect(wrapper.emitted("close")?.length).toBeGreaterThanOrEqual(3);
  });

  it("resets the form when reopened", async () => {
    const wrapper = mountModal({ open: false });
    await wrapper.setProps({ open: true, initialName: "First" });
    expect(
      (wrapper.get('[data-testid="cms-create-tag-type-name-nl"]').element as HTMLInputElement).value,
    ).toBe("First");

    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true, initialName: "Second" });
    expect(
      (wrapper.get('[data-testid="cms-create-tag-type-name-nl"]').element as HTMLInputElement).value,
    ).toBe("Second");
  });

  it("uses lang-grid-double when two languages are visible", async () => {
    const wrapper = mountModal();
    const pills = wrapper.findAll(".cms-language-pill");
    await pills[1].trigger("click");
    expect(wrapper.find(".cms-lang-grid-double").exists()).toBe(true);
  });

  it("uses the full lang-grid (three columns) when all languages are visible", async () => {
    const wrapper = mountModal();
    const pills = wrapper.findAll(".cms-language-pill");
    await pills[1].trigger("click");
    await pills[2].trigger("click");
    expect(wrapper.find(".cms-lang-grid-single").exists()).toBe(false);
    expect(wrapper.find(".cms-lang-grid-double").exists()).toBe(false);
  });
});
