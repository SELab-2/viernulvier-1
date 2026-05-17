import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n, type SupportedLang } from "@/i18n";
import type { CreateTagTypeFormState } from "@/services/cms";
import { buildEmptyTagTypeForm } from "@/services/cms";
import CmsCreateTagTypeModal from "@/components/admin/cms/tagTypes/CmsCreateTagTypeModal.vue";

function mountModal(
  overrides: Partial<{ open: boolean; createError: string | null; isCreating: boolean; createExtraLangs: { en: boolean; fr: boolean }; visibleCreateLangs: SupportedLang[] }> = {},
) {
  return mount(CmsCreateTagTypeModal, {
    global: { plugins: [i18n] },
    props: {
      open: true,
      createForm: buildEmptyTagTypeForm() as CreateTagTypeFormState,
      createExtraLangs: { en: false, fr: false },
      visibleCreateLangs: ["nl"],
      langGridClass: "cms-lang-grid cms-lang-grid-single",
      createError: null,
      isCreating: false,
      ...overrides,
    },
  });
}

describe("CmsCreateTagTypeModal", () => {
  describe("visibility", () => {
    it("does not render when open is false", () => {
      const wrapper = mountModal({ open: false });
      expect(wrapper.find(".cms-create-modal").exists()).toBe(false);
    });

    it("renders when open is true", () => {
      const wrapper = mountModal({ open: true });
      expect(wrapper.find(".cms-create-modal").exists()).toBe(true);
    });
  });

  describe("emits – close", () => {
    it("emits close on overlay click", async () => {
      const wrapper = mountModal();
      await wrapper.get(".cms-modal-overlay").trigger("click");
      expect(wrapper.emitted("close")).toHaveLength(1);
    });

    it("emits close on header close button click", async () => {
      const wrapper = mountModal();
      await wrapper.get(".cms-modal-header .cms-side-close").trigger("click");
      expect(wrapper.emitted("close")).toHaveLength(1);
    });

    it("does not emit close when modal section is clicked (self modifier)", async () => {
      const wrapper = mountModal();
      await wrapper.get(".cms-create-modal").trigger("click");
      expect(wrapper.emitted("close")).toBeFalsy();
    });

    it("emits close on footer cancel button click", async () => {
      const wrapper = mountModal();
      await wrapper.get(".cms-modal-footer .cms-side-close").trigger("click");
      expect(wrapper.emitted("close")).toHaveLength(1);
    });
  });

  describe("emits – submit", () => {
    it("emits submit when submit button is clicked", async () => {
      const wrapper = mountModal();
      await wrapper.get('[data-testid="cms-create-tag-type-submit"]').trigger("click");
      expect(wrapper.emitted("submit")).toHaveLength(1);
    });

    it("disables the submit button while isCreating", () => {
      const wrapper = mountModal({ isCreating: true });
      const btn = wrapper.get('[data-testid="cms-create-tag-type-submit"]').element as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it("shows saving text while isCreating", () => {
      const wrapper = mountModal({ isCreating: true });
      const btn = wrapper.get('[data-testid="cms-create-tag-type-submit"]');
      expect(btn.text()).toMatch(/saving|opslaan/i);
    });
  });

  describe("emits – update-extra-lang", () => {
    it("emits update-extra-lang ('en', true) when EN pill is clicked while en is inactive", async () => {
      const wrapper = mountModal({ createExtraLangs: { en: false, fr: false } });
      const pills = wrapper.findAll(".cms-language-pill");
      await pills[1].trigger("click"); // EN is second pill
      expect(wrapper.emitted("update-extra-lang")?.[0]).toEqual(["en", true]);
    });

    it("emits update-extra-lang ('en', false) when EN pill is clicked while en is active", async () => {
      const wrapper = mountModal({ createExtraLangs: { en: true, fr: false } });
      const pills = wrapper.findAll(".cms-language-pill");
      await pills[1].trigger("click");
      expect(wrapper.emitted("update-extra-lang")?.[0]).toEqual(["en", false]);
    });

    it("emits update-extra-lang ('fr', true) when FR pill is clicked while fr is inactive", async () => {
      const wrapper = mountModal({ createExtraLangs: { en: false, fr: false } });
      const pills = wrapper.findAll(".cms-language-pill");
      await pills[2].trigger("click"); // FR is third pill
      expect(wrapper.emitted("update-extra-lang")?.[0]).toEqual(["fr", true]);
    });

    it("emits update-extra-lang ('fr', false) when FR pill is clicked while fr is active", async () => {
      const wrapper = mountModal({ createExtraLangs: { en: false, fr: true } });
      const pills = wrapper.findAll(".cms-language-pill");
      await pills[2].trigger("click");
      expect(wrapper.emitted("update-extra-lang")?.[0]).toEqual(["fr", false]);
    });

    it("applies active class to EN pill when en is true", () => {
      const wrapper = mountModal({ createExtraLangs: { en: true, fr: false } });
      const pills = wrapper.findAll(".cms-language-pill");
      expect(pills[1].classes()).toContain("active");
    });

    it("does not apply active class to FR pill when fr is false", () => {
      const wrapper = mountModal({ createExtraLangs: { en: false, fr: false } });
      const pills = wrapper.findAll(".cms-language-pill");
      expect(pills[2].classes()).not.toContain("active");
    });
  });

  describe("emits – update-name", () => {
    it("emits update-name with lang and value on input", async () => {
      const wrapper = mountModal();
      const input = wrapper.get('[data-testid="cms-create-tag-type-name-nl"]');
      await input.setValue("Genre");
      const events = wrapper.emitted("update-name") ?? [];
      expect(events[events.length - 1]).toEqual(["nl", "Genre"]);
    });

    it("renders inputs for each visible lang", () => {
      const wrapper = mountModal({ visibleCreateLangs: ["nl", "en", "fr"] });
      expect(wrapper.find('[data-testid="cms-create-tag-type-name-nl"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="cms-create-tag-type-name-en"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="cms-create-tag-type-name-fr"]').exists()).toBe(true);
    });
  });

  describe("create error", () => {
    it("shows the createError message when present", () => {
      const wrapper = mountModal({ createError: "Something went wrong" });
      expect(wrapper.text()).toContain("Something went wrong");
    });

    it("does not show an error paragraph when createError is null", () => {
      const wrapper = mountModal({ createError: null });
      expect(wrapper.find(".text-red-700").exists()).toBe(false);
    });
  });
});
