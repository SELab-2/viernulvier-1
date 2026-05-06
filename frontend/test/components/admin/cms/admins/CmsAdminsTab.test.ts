import { describe, expect, it, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { i18n } from "@/i18n";
import CmsAdminsTab from "@/components/admin/cms/admins/CmsAdminsTab.vue";
import * as auth from "@/services/auth";
import type { Admin } from "@viernulvier/shared";

vi.mock("ag-grid-vue3", () => ({
  AgGridVue: { template: "<div class='ag-grid-mock' />" },
}));

vi.mock("@/composables/useDarkMode", () => ({
  useDarkMode: () => ({ isDark: { value: false } }),
}));

vi.mock("@/components/admin/cms/admins/CmsCreateAdminModal.vue", () => ({
  default: {
    template: `
      <div v-if="open" data-testid="create-admin-modal">
        <button data-testid="modal-submit" @click="$emit('submit')" />
        <button data-testid="modal-close" @click="$emit('close')" />
        <button data-testid="modal-update-username" @click="$emit('update-username', 'alice')" />
        <button data-testid="modal-update-password" @click="$emit('update-password', 'secret')" />
        <button data-testid="modal-update-super" @click="$emit('update-super', true)" />
      </div>
    `,
    props: ["open", "createForm", "createError", "isCreating"],
    emits: ["close", "submit", "update-username", "update-password", "update-super"],
  },
}));

// Module-level so the hoisted vi.mock factory can close over it
let mockStoreAdmin: Admin = {
  id: 1,
  username: "testadmin",
  profile_picture: null,
  super: false,
};

vi.mock("@/stores/auth", () => ({
  useAuthStore: () => ({ admin: mockStoreAdmin }),
}));

const baseAdmin: Admin = {
  id: 1,
  username: "testadmin",
  profile_picture: null,
  super: false,
};

const superAdmin: Admin = {
  ...baseAdmin,
  super: true,
};

function mountTab() {
  return mount(CmsAdminsTab, {
    global: {
      plugins: [i18n],
      stubs: {
        CmsGridControls: { template: "<div />" },
        CmsColumnChooser: { template: "<div />", props: ["show"] },
      },
    },
  });
}

describe("CmsAdminsTab", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockStoreAdmin = { ...baseAdmin };
  });

  describe("permissions", () => {
    it("blocks non-super admins completely", async () => {
      const wrapper = mountTab();
      await flushPromises();

      expect(wrapper.text()).toMatch(/toestemming/i);
      expect(wrapper.find(".ag-grid-mock").exists()).toBe(false);

      const spy = vi.spyOn(auth, "getAllAdmins");
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("loading lifecycle", () => {
    beforeEach(() => {
      mockStoreAdmin = { ...superAdmin };
    });

    it("sets loading state while fetching", async () => {
      let resolve: Function;
      const promise = new Promise((r) => (resolve = r));

      vi.spyOn(auth, "getAllAdmins").mockReturnValue(promise as any);

      const wrapper = mountTab();

      expect(wrapper.vm.__test.isLoading.value).toBe(true);

      resolve!([]);
      await flushPromises();

      expect(wrapper.vm.__test.isLoading.value).toBe(false);
    });

    it("fetches admins on mount", async () => {
      const spy = vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);

      mountTab();
      await flushPromises();

      expect(spy).toHaveBeenCalledOnce();
    });

    it("renders grid when loaded", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);

      const wrapper = mountTab();
      await flushPromises();

      expect(wrapper.find(".ag-grid-mock").exists()).toBe(true);
    });

    it("shows empty state", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);

      const wrapper = mountTab();
      await flushPromises();

      expect(wrapper.text()).toMatch(/geen admins/i);
    });

    it("handles load error", async () => {
      vi.spyOn(auth, "getAllAdmins").mockRejectedValue(new Error("fail"));

      const wrapper = mountTab();
      await flushPromises();

      expect(wrapper.vm.__test.loadError.value).toBeTruthy();
      expect(wrapper.find(".ag-grid-mock").exists()).toBe(false);
    });
  });

  describe("editing behavior", () => {
    beforeEach(() => {
      mockStoreAdmin = { ...superAdmin };
    });

    function createEvent(overrides = {}) {
      return {
        data: { id: 1, username: "old", super: false },
        colDef: { field: "username" },
        value: "new",
        oldValue: "old",
        node: {
          setDataValue: vi.fn(),
        },
        ...overrides,
      } as any;
    }

    it("does nothing if value did not change", async () => {
      const wrapper = mountTab();
      const event = createEvent({ value: "old" });

      await wrapper.vm.__test.onCellEditingStopped(event);

      expect(event.node.setDataValue).not.toHaveBeenCalled();
    });

    it("reverts empty username", async () => {
      const wrapper = mountTab();
      const event = createEvent({ value: "   " });

      await wrapper.vm.__test.onCellEditingStopped(event);

      expect(event.node.setDataValue).toHaveBeenCalledWith("username", "old");
    });

    it("updates username", async () => {
      vi.spyOn(auth, "updateAdmin").mockResolvedValue({
        id: 1,
        username: "new",
        profile_picture: null,
        super: false,
      });

      const wrapper = mountTab();
      const event = createEvent();

      await wrapper.vm.__test.onCellEditingStopped(event);

      expect(auth.updateAdmin).toHaveBeenCalledWith(1, { username: "new" });
    });

    it("updates super flag", async () => {
      vi.spyOn(auth, "updateAdmin").mockResolvedValue({
        id: 1,
        username: "old",
        profile_picture: null,
        super: true,
      });

      const wrapper = mountTab();

      const event = createEvent({
        colDef: { field: "super" },
        value: true,
        oldValue: false,
      });

      await wrapper.vm.__test.onCellEditingStopped(event);

      expect(auth.updateAdmin).toHaveBeenCalledWith(1, { super: true });
    });

    it("reverts on save error", async () => {
      vi.spyOn(auth, "updateAdmin").mockRejectedValue(new Error("fail"));

      const wrapper = mountTab();
      const event = createEvent();

      await wrapper.vm.__test.onCellEditingStopped(event);

      expect(event.node.setDataValue).toHaveBeenCalledWith("username", "old");
      expect(wrapper.vm.__test.saveError.value).toBeTruthy();
    });

    it("reverts unknown field without saving", async () => {
      const spy = vi.spyOn(auth, "updateAdmin");
      const wrapper = mountTab();
      const event = createEvent({ colDef: { field: "profilePicture" }, value: "x", oldValue: "y" });

      await wrapper.vm.__test.onCellEditingStopped(event);

      expect(spy).not.toHaveBeenCalled();
      expect(event.node.setDataValue).toHaveBeenCalledWith("profilePicture", "y");
    });
  });

  describe("create modal", () => {
    beforeEach(() => {
      mockStoreAdmin = { ...superAdmin };
    });

    it("modal is closed by default", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);
      const wrapper = mountTab();
      await flushPromises();

      expect(wrapper.find('[data-testid="create-admin-modal"]').exists()).toBe(false);
    });

    it("opens modal when add button is clicked", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);
      const wrapper = mountTab();
      await flushPromises();

      await wrapper.find('[data-testid="cms-add-admin"]').trigger("click");

      expect(wrapper.find('[data-testid="create-admin-modal"]').exists()).toBe(true);
    });

    it("closes modal on close emit", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);
      const wrapper = mountTab();
      await flushPromises();

      wrapper.vm.__test.openCreateModal();
      await wrapper.vm.$nextTick();

      await wrapper.find('[data-testid="modal-close"]').trigger("click");

      expect(wrapper.find('[data-testid="create-admin-modal"]').exists()).toBe(false);
    });

    it("resets form on close", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);
      const wrapper = mountTab();
      await flushPromises();

      wrapper.vm.__test.setCreateUsername("alice");
      wrapper.vm.__test.setCreatePassword("secret");
      wrapper.vm.__test.closeCreateModal();

      expect(wrapper.vm.__test.createForm.value.username).toBe("");
      expect(wrapper.vm.__test.createForm.value.password).toBe("");
    });

    it("updates username via setter", async () => {
      const wrapper = mountTab();
      wrapper.vm.__test.setCreateUsername("bob");
      expect(wrapper.vm.__test.createForm.value.username).toBe("bob");
    });

    it("updates password via setter", async () => {
      const wrapper = mountTab();
      wrapper.vm.__test.setCreatePassword("hunter2");
      expect(wrapper.vm.__test.createForm.value.password).toBe("hunter2");
    });

    it("updates super via setter", async () => {
      const wrapper = mountTab();
      wrapper.vm.__test.setCreateSuper(true);
      expect(wrapper.vm.__test.createForm.value.super).toBe(true);
    });

    it("updates username from modal emit", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);
      const wrapper = mountTab();
      await flushPromises();

      wrapper.vm.__test.openCreateModal();
      await wrapper.vm.$nextTick();

      await wrapper.find('[data-testid="modal-update-username"]').trigger("click");

      expect(wrapper.vm.__test.createForm.value.username).toBe("alice");
    });

    it("updates password from modal emit", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);
      const wrapper = mountTab();
      await flushPromises();

      wrapper.vm.__test.openCreateModal();
      await wrapper.vm.$nextTick();

      await wrapper.find('[data-testid="modal-update-password"]').trigger("click");

      expect(wrapper.vm.__test.createForm.value.password).toBe("secret");
    });

    it("updates super from modal emit", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);
      const wrapper = mountTab();
      await flushPromises();

      wrapper.vm.__test.openCreateModal();
      await wrapper.vm.$nextTick();

      await wrapper.find('[data-testid="modal-update-super"]').trigger("click");

      expect(wrapper.vm.__test.createForm.value.super).toBe(true);
    });

    it("submits and reloads on success", async () => {
      const getAllSpy = vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);
      vi.spyOn(auth, "createAdmin").mockResolvedValue({
        id: 2,
        username: "alice",
        profile_picture: null,
        super: false,
      });

      const wrapper = mountTab();
      await flushPromises();

      wrapper.vm.__test.setCreateUsername("alice");
      wrapper.vm.__test.setCreatePassword("secret");
      await wrapper.vm.__test.submitCreateAdmin();
      await flushPromises();

      // Called once on mount, once after create
      expect(getAllSpy).toHaveBeenCalledTimes(2);
      expect(wrapper.vm.__test.createModalOpen.value).toBe(false);
    });

    it("shows create error on submit failure", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);
      vi.spyOn(auth, "createAdmin").mockRejectedValue(new Error("Username taken"));

      const wrapper = mountTab();
      await flushPromises();

      await wrapper.vm.__test.submitCreateAdmin();
      await flushPromises();

      expect(wrapper.vm.__test.createError.value).toMatch(/username taken/i);
      expect(wrapper.vm.__test.createModalOpen.value).toBe(false);
    });

    it("sets isCreating during submission", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);

      let resolve: Function;
      const promise = new Promise((r) => (resolve = r));
      vi.spyOn(auth, "createAdmin").mockReturnValue(promise as any);

      const wrapper = mountTab();
      await flushPromises();

      const submitPromise = wrapper.vm.__test.submitCreateAdmin();
      expect(wrapper.vm.__test.isCreating.value).toBe(true);

      resolve!({ id: 2, username: "alice", profile_picture: null, super: false });
      await submitPromise;
      await flushPromises();

      expect(wrapper.vm.__test.isCreating.value).toBe(false);
    });

    it("clears createError when modal is reopened", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);
      const wrapper = mountTab();
      await flushPromises();

      wrapper.vm.__test.createError.value = "some previous error";
      wrapper.vm.__test.openCreateModal();

      expect(wrapper.vm.__test.createError.value).toBeNull();
    });
  });

  describe("unmount behavior", () => {
    beforeEach(() => {
      mockStoreAdmin = { ...superAdmin };
    });

    it("does not throw on unmount", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);
      const wrapper = mountTab();
      await flushPromises();

      expect(() => wrapper.unmount()).not.toThrow();
    });
  });

});