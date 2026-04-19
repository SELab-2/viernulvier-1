import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "@/i18n";
import type { CreateFormState } from "@/services/cms";
import CmsCreateProductionModal from "@/components/admin/cms/productions/CmsCreateProductionModal.vue";

const tagGroups = [
  {
    tagTypeId: 1,
    label: "Genre",
    isGenre: true,
    tags: [{ id: 10, label: "Drama" }],
  },
  {
    tagTypeId: 2,
    label: "Theme",
    isGenre: false,
    tags: [{ id: 20, label: "Classic" }],
  },
];

function buildForm(overrides: Partial<CreateFormState> = {}): CreateFormState {
  return {
    finalized: false,
    title: { nl: "", fr: "", en: "" },
    artist: { nl: "", fr: "", en: "" },
    tagline: { nl: "", fr: "", en: "" },
    teaser: { nl: "", fr: "", en: "" },
    supertitle: { nl: "", fr: "", en: "" },
    description: { nl: "", fr: "", en: "" },
    description_2: { nl: "", fr: "", en: "" },
    video_1: { nl: "", fr: "", en: "" },
    video_2: { nl: "", fr: "", en: "" },
    ...overrides,
  };
}

function mountModal(overrides: Partial<InstanceType<typeof CmsCreateProductionModal>["$props"]> = {}) {
  return mount(CmsCreateProductionModal, {
    props: {
      open: true,
      createForm: buildForm(),
      createExtraLangs: { en: false, fr: false },
      visibleCreateLangs: ["nl", "en", "fr"],
      langGridClass: "cms-lang-grid",
      createFields: [
        { key: "title", labelKey: "cms.create.fields.title", required: true, multiline: false },
        { key: "teaser", labelKey: "cms.create.fields.teaser", required: true, multiline: true },
      ],
      tagGroups,
      selectedPrimaryTagId: 10,
      selectedTagIds: [20],
      createError: null,
      isCreating: false,
      ...overrides,
    },
    global: {
      plugins: [i18n],
    },
  });
}

describe("CmsCreateProductionModal.vue", () => {
  it("does not render when closed", () => {
    const closed = mountModal({ open: false });
    expect(closed.find(".cms-modal-overlay").exists()).toBe(false);
  });

  it("emits updates for finalized, extra languages and form fields", async () => {
    const wrapper = mountModal();

    await wrapper.get('input[type="checkbox"]').setValue(true);
    await wrapper.get(".cms-language-pill:not(.active)").trigger("click");
    await wrapper.get('input[type="text"]').setValue("New title");
    await wrapper.get('textarea').setValue("New teaser");
    await wrapper.get("select").setValue("10");
    await wrapper.get(".cms-tag-group input[type='checkbox']").setValue(true);

    expect(wrapper.emitted("update-finalized")?.[0]).toEqual([true]);
    expect(wrapper.emitted("update-extra-lang")?.[0]).toEqual(["en", true]);
    expect(wrapper.emitted("update-form-field")?.some((payload) => payload[0] === "title")).toBe(true);
    expect(wrapper.emitted("update-form-field")?.some((payload) => payload[0] === "teaser")).toBe(true);
    expect(wrapper.emitted("update-primary-tag")?.[0]).toEqual([10]);
  });

  it("emits file change, close and submit events", async () => {
    const wrapper = mountModal();

    await wrapper.get('input[type="file"][accept="image/*"]').trigger("change");
    await wrapper.get('input[type="file"][accept="video/*"]').trigger("change");
    await wrapper.get(".cms-modal-overlay").trigger("click.self");
    await wrapper.get(".cms-side-save").trigger("click");

    expect(wrapper.emitted("image-file-change")?.length).toBe(1);
    expect(wrapper.emitted("video-file-change")?.length).toBe(1);
    expect(wrapper.emitted("close")?.length).toBeGreaterThan(0);
    expect(wrapper.emitted("submit")?.length).toBe(1);
  });

  it("shows error text and saving label while loading", () => {
    const wrapper = mountModal({
      createError: "Could not save",
      isCreating: true,
    });

    expect(wrapper.text()).toContain("Could not save");
    expect(wrapper.text()).toContain(i18n.global.t("cms.create.saving"));
    expect(wrapper.get(".cms-side-save").attributes("disabled")).toBeDefined();
  });
});
