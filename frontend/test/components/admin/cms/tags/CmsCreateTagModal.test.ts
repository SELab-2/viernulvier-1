import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import type { TagType } from "@viernulvier/shared";
import { i18n } from "@/i18n";
import type { CreateTagFormState } from "@/services/cms";
import { buildEmptyTagForm } from "@/services/cms";
import CmsCreateTagModal from "@/components/admin/cms/tags/CmsCreateTagModal.vue";
import type { LanguageMap } from "@/utils/i18n";

const tagTypes: TagType[] = [
  { id: 1, old_id: null, name: { en: "Genre" } } as TagType,
  { id: 2, old_id: null, name: {} } as TagType,
];

const localizeValue = (map: LanguageMap | null | undefined): string =>
  map ? (map.en ?? "") : "";

function mountModal(overrides: Partial<CreateTagFormState> = {}, open = true) {
  return mount(CmsCreateTagModal, {
    global: { plugins: [i18n] },
    props: {
      open,
      createForm: { ...buildEmptyTagForm(), ...overrides },
      createExtraLangs: { en: false, fr: false },
      visibleCreateLangs: ["nl"],
      langGridClass: "cms-lang-grid cms-lang-grid-single",
      tagTypes,
      createError: null,
      isCreating: false,
      localizeValue,
    },
  });
}

describe("CmsCreateTagModal", () => {
  it("does not render when closed", () => {
    const wrapper = mountModal({}, false);
    expect(wrapper.find(".cms-modal").exists()).toBe(false);
  });

  it("emits update-name on name input", async () => {
    const wrapper = mountModal();
    await wrapper.get('[data-testid="cms-create-tag-name-nl"]').setValue("Drama");
    const events = wrapper.emitted("update-name");
    expect(events?.[events.length - 1]).toEqual(["nl", "Drama"]);
  });

  it("emits update-tag-type with parsed number on select change", async () => {
    const wrapper = mountModal();
    await wrapper.get('[data-testid="cms-create-tag-type"]').setValue("1");
    expect(wrapper.emitted("update-tag-type")?.[0]).toEqual([1]);
  });

  it("emits update-tag-type with null when the placeholder option is chosen", async () => {
    const wrapper = mountModal();
    const select = wrapper.get('[data-testid="cms-create-tag-type"]').element as HTMLSelectElement;
    select.value = "";
    await wrapper.get('[data-testid="cms-create-tag-type"]').trigger("change");
    expect(wrapper.emitted("update-tag-type")?.[0]).toEqual([null]);
  });

  it("emits update-public on checkbox toggle", async () => {
    const wrapper = mountModal({ public: true });
    await wrapper.get('[data-testid="cms-create-tag-public"]').setValue(false);
    expect(wrapper.emitted("update-public")?.[0]).toEqual([false]);
  });

  it("emits update-extra-lang when toggling EN/FR pills", async () => {
    const wrapper = mountModal();
    const pills = wrapper.findAll(".cms-language-pill");
    await pills[1].trigger("click");
    await pills[2].trigger("click");
    const events = wrapper.emitted("update-extra-lang") ?? [];
    expect(events[0]).toEqual(["en", true]);
    expect(events[1]).toEqual(["fr", true]);
  });

  it("emits close on overlay click and cancel button", async () => {
    const wrapper = mountModal();
    await wrapper.get(".cms-modal-overlay").trigger("click");
    await wrapper.get(".cms-modal-header .cms-side-close").trigger("click");
    expect((wrapper.emitted("close") ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("emits submit on the save button", async () => {
    const wrapper = mountModal();
    await wrapper.get(".cms-side-save").trigger("click");
    expect(wrapper.emitted("submit")).toHaveLength(1);
  });

  it("falls back to #id label when tag type has no localisable name", () => {
    const wrapper = mountModal();
    expect(wrapper.text()).toContain("#2");
  });

  it("disables the save button while creating", () => {
    const wrapper = mount(CmsCreateTagModal, {
      global: { plugins: [i18n] },
      props: {
        open: true,
        createForm: buildEmptyTagForm(),
        createExtraLangs: { en: false, fr: false },
        visibleCreateLangs: ["nl"],
        langGridClass: "cms-lang-grid cms-lang-grid-single",
        tagTypes,
        createError: null,
        isCreating: true,
        localizeValue,
      },
    });
    expect((wrapper.get(".cms-side-save").element as HTMLButtonElement).disabled).toBe(true);
  });

  it("renders a create error when present", () => {
    const wrapper = mount(CmsCreateTagModal, {
      global: { plugins: [i18n] },
      props: {
        open: true,
        createForm: buildEmptyTagForm(),
        createExtraLangs: { en: false, fr: false },
        visibleCreateLangs: ["nl"],
        langGridClass: "cms-lang-grid cms-lang-grid-single",
        tagTypes,
        createError: "Something went wrong",
        isCreating: false,
        localizeValue,
      },
    });
    expect(wrapper.text()).toContain("Something went wrong");
  });
});
