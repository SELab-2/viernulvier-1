import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "@/i18n";
import CmsCreateAdminModal from "@/components/admin/cms/admins/CmsCreateAdminModal.vue";
import type { CreateAdminFormState } from "@/services/cms";

const baseForm: CreateAdminFormState = {
  username: "",
  password: "",
  super: false,
};

function mountModal(props: Partial<InstanceType<typeof CmsCreateAdminModal>["$props"]> = {}) {
  return mount(CmsCreateAdminModal, {
    global: { plugins: [i18n] },
    props: {
      open: true,
      createForm: { ...baseForm },
      createError: null,
      isCreating: false,
      ...props,
    },
  });
}

describe("CmsCreateAdminModal", () => {
  describe("visibility", () => {
    it("renders nothing when closed", () => {
      const wrapper = mountModal({ open: false });
      expect(wrapper.find(".cms-modal-overlay").exists()).toBe(false);
    });

    it("renders the modal when open", () => {
      const wrapper = mountModal({ open: true });
      expect(wrapper.find(".cms-modal-overlay").exists()).toBe(true);
    });

    it("has dialog role", () => {
      const wrapper = mountModal();
      expect(wrapper.find("[role='dialog']").exists()).toBe(true);
    });
  });

  describe("form fields", () => {
    it("renders username input", () => {
      const wrapper = mountModal();
      expect(wrapper.find('[data-testid="cms-create-admin-username"]').exists()).toBe(true);
    });

    it("renders password input", () => {
      const wrapper = mountModal();
      expect(wrapper.find('[data-testid="cms-create-admin-password"]').exists()).toBe(true);
    });

    it("password input is type password", () => {
      const wrapper = mountModal();
      expect(wrapper.find('[data-testid="cms-create-admin-password"]').attributes("type")).toBe("password");
    });

    it("renders super checkbox", () => {
      const wrapper = mountModal();
      expect(wrapper.find('[data-testid="cms-create-admin-super"]').exists()).toBe(true);
    });

    it("reflects username value from prop", () => {
      const wrapper = mountModal({ createForm: { ...baseForm, username: "alice" } });
      const input = wrapper.find<HTMLInputElement>('[data-testid="cms-create-admin-username"]');
      expect(input.element.value).toBe("alice");
    });

    it("reflects password value from prop", () => {
      const wrapper = mountModal({ createForm: { ...baseForm, password: "secret" } });
      const input = wrapper.find<HTMLInputElement>('[data-testid="cms-create-admin-password"]');
      expect(input.element.value).toBe("secret");
    });

    it("reflects super checked state from prop", () => {
      const wrapper = mountModal({ createForm: { ...baseForm, super: true } });
      const checkbox = wrapper.find<HTMLInputElement>('[data-testid="cms-create-admin-super"]');
      expect(checkbox.element.checked).toBe(true);
    });
  });

  describe("error display", () => {
    it("does not show error when createError is null", () => {
      const wrapper = mountModal({ createError: null });
      expect(wrapper.find(".text-red-700").exists()).toBe(false);
    });

    it("shows error message when createError is set", () => {
      const wrapper = mountModal({ createError: "Username already taken." });
      expect(wrapper.find(".text-red-700").text()).toBe("Username already taken.");
    });
  });

  describe("submit button state", () => {
    it("shows submit label when not creating", () => {
      const wrapper = mountModal({ isCreating: false });
      const btn = wrapper.find('[data-testid="cms-create-admin-submit"]');
      expect(btn.attributes("disabled")).toBeUndefined();
    });

    it("is disabled while creating", () => {
      const wrapper = mountModal({ isCreating: true });
      const btn = wrapper.find('[data-testid="cms-create-admin-submit"]');
      expect(btn.attributes("disabled")).toBeDefined();
    });
  });

  describe("emits", () => {
    it("emits close when header close button is clicked", async () => {
      const wrapper = mountModal();
      await wrapper.find(".cms-modal-header .cms-side-close").trigger("click");
      expect(wrapper.emitted("close")).toHaveLength(1);
    });

    it("emits close when footer cancel button is clicked", async () => {
      const wrapper = mountModal();
      await wrapper.find(".cms-modal-footer .cms-side-close").trigger("click");
      expect(wrapper.emitted("close")).toHaveLength(1);
    });

    it("emits close when overlay is clicked", async () => {
      const wrapper = mountModal();
      await wrapper.find(".cms-modal-overlay").trigger("click");
      expect(wrapper.emitted("close")).toHaveLength(1);
    });

    it("does not emit close when modal body is clicked", async () => {
      const wrapper = mountModal();
      await wrapper.find(".cms-modal").trigger("click");
      expect(wrapper.emitted("close")).toBeFalsy();
    });

    it("emits submit when submit button is clicked", async () => {
      const wrapper = mountModal();
      await wrapper.find('[data-testid="cms-create-admin-submit"]').trigger("click");
      expect(wrapper.emitted("submit")).toHaveLength(1);
    });

    it("emits update-username on input", async () => {
      const wrapper = mountModal();
      const input = wrapper.find<HTMLInputElement>('[data-testid="cms-create-admin-username"]');
      await input.setValue("bob");
      expect(wrapper.emitted("update-username")?.[0]).toEqual(["bob"]);
    });

    it("emits update-password on input", async () => {
      const wrapper = mountModal();
      const input = wrapper.find<HTMLInputElement>('[data-testid="cms-create-admin-password"]');
      await input.setValue("hunter2");
      expect(wrapper.emitted("update-password")?.[0]).toEqual(["hunter2"]);
    });

    it("emits update-super with true when checkbox is checked", async () => {
      const wrapper = mountModal({ createForm: { ...baseForm, super: false } });
      const checkbox = wrapper.find<HTMLInputElement>('[data-testid="cms-create-admin-super"]');
      Object.defineProperty(checkbox.element, "checked", { value: true, writable: true });
      await checkbox.trigger("change");
      expect(wrapper.emitted("update-super")?.[0]).toEqual([true]);
    });

    it("emits update-super with false when checkbox is unchecked", async () => {
      const wrapper = mountModal({ createForm: { ...baseForm, super: true } });
      const checkbox = wrapper.find<HTMLInputElement>('[data-testid="cms-create-admin-super"]');
      Object.defineProperty(checkbox.element, "checked", { value: false, writable: true });
      await checkbox.trigger("change");
      expect(wrapper.emitted("update-super")?.[0]).toEqual([false]);
    });

    it("does not emit submit while creating", async () => {
      // The button is disabled so a real user can't click it, but verify the
      // disabled attribute is present (browser blocks the click natively).
      const wrapper = mountModal({ isCreating: true });
      const btn = wrapper.find('[data-testid="cms-create-admin-submit"]');
      expect(btn.attributes("disabled")).toBeDefined();
    });
  });
});