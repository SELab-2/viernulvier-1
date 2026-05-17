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

    it("handles load error", async () => {
      vi.spyOn(auth, "getAllAdmins").mockRejectedValue(new Error("fail"));

      const wrapper = mountTab();
      await flushPromises();

      expect(wrapper.vm.__test.loadError.value).toBeTruthy();
      expect(wrapper.find(".ag-grid-mock").exists()).toBe(false);
    });

    it("sets generic load error when getAllAdmins rejects with a non-Error", async () => {
      vi.spyOn(auth, "getAllAdmins").mockRejectedValue("raw string error");

      const wrapper = mountTab();
      await flushPromises();

      expect(wrapper.vm.__test.loadError.value).toBeTruthy();
      expect(wrapper.vm.__test.loadError.value).not.toMatch(/raw string error/);
    });

    it("quickFilterText ref can be updated", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);
      const wrapper = mountTab();
      await flushPromises();

      wrapper.vm.__test.quickFilterText.value = "alice";
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.__test.quickFilterText.value).toBe("alice");
    });

    it("columnChooserOpen ref can be updated", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);
      const wrapper = mountTab();
      await flushPromises();

      wrapper.vm.__test.columnChooserOpen.value = true;
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.__test.columnChooserOpen.value).toBe(true);
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

    it("does nothing when colDef.field is missing", async () => {
      const wrapper = mountTab();
      const event = createEvent({ colDef: { field: undefined } });

      await wrapper.vm.__test.onCellEditingStopped(event);

      expect(event.node.setDataValue).not.toHaveBeenCalled();
    });

    it("reverts username when newValue is null", async () => {
      const wrapper = mountTab();
      const event = createEvent({ value: null });

      await wrapper.vm.__test.onCellEditingStopped(event);

      expect(event.node.setDataValue).toHaveBeenCalledWith("username", "old");
    });

    it("sets generic save error when updateAdmin rejects with a non-Error", async () => {
      vi.spyOn(auth, "updateAdmin").mockRejectedValue("raw string error");

      const wrapper = mountTab();
      const event = createEvent();

      await wrapper.vm.__test.onCellEditingStopped(event);

      expect(wrapper.vm.__test.saveError.value).toBeTruthy();
      expect(wrapper.vm.__test.saveError.value).not.toMatch(/raw string error/);
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

    it("sets generic create error when createAdmin rejects with a non-Error", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);
      vi.spyOn(auth, "createAdmin").mockRejectedValue("raw string error");

      const wrapper = mountTab();
      await flushPromises();

      await wrapper.vm.__test.submitCreateAdmin();
      await flushPromises();

      expect(wrapper.vm.__test.createError.value).toBeTruthy();
      expect(wrapper.vm.__test.createError.value).not.toMatch(/raw string error/);
    });
  });

  describe("remove modal", () => {
    beforeEach(() => {
      mockStoreAdmin = { ...superAdmin };
    });

    it("remove button is disabled when nothing is selected", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);
      const wrapper = mountTab();
      await flushPromises();

      const btn = wrapper.find('[data-testid="cms-remove-admins"]');
      expect(btn.attributes("disabled")).toBeDefined();
    });

    it("remove button is enabled when rows are selected", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);
      const wrapper = mountTab();
      await flushPromises();

      wrapper.vm.__test.selectedCount.value = 2;
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="cms-remove-admins"]').attributes("disabled")).toBeUndefined();
    });

    it("remove confirm modal is hidden by default", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);
      const wrapper = mountTab();
      await flushPromises();

      expect(wrapper.vm.__test.removeConfirmOpen.value).toBe(false);
    });

    it("opens remove confirm when openRemoveConfirm is called", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);
      const wrapper = mountTab();
      await flushPromises();

      wrapper.vm.__test.selectedCount.value = 1;
      wrapper.vm.__test.openRemoveConfirm();
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.__test.removeConfirmOpen.value).toBe(true);
    });

    it("closes remove confirm when closeRemoveConfirm is called", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);
      const wrapper = mountTab();
      await flushPromises();

      wrapper.vm.__test.selectedCount.value = 1;
      wrapper.vm.__test.openRemoveConfirm();
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.__test.removeConfirmOpen.value).toBe(true); // first check if it's actually open before we close
      wrapper.vm.__test.closeRemoveConfirm();
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.__test.removeConfirmOpen.value).toBe(false);
    });
  });

  describe("remove confirm flow", () => {
    beforeEach(() => {
      mockStoreAdmin = { ...superAdmin };
    });

    it("calls deleteAdmin for each selected row on confirm", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);
      const deleteSpy = vi.spyOn(auth, "deleteAdmin").mockResolvedValue(undefined as any);

      const wrapper = mountTab();
      await flushPromises();

      vi.spyOn(wrapper.vm.__test.gridApi, "value", "get").mockReturnValue({
        getSelectedRows: () => [
          { id: 2, username: "alice", super: false },
          { id: 3, username: "bob", super: false },
        ],
        deselectAll: vi.fn(),
      } as any);
      wrapper.vm.__test.selectedCount.value = 2;

      await wrapper.vm.__test.confirmRemove();
      await flushPromises();

      expect(deleteSpy).toHaveBeenCalledWith(2);
      expect(deleteSpy).toHaveBeenCalledWith(3);
    });

    it("reloads admins and deselects all after successful remove", async () => {
      const getAllSpy = vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);
      vi.spyOn(auth, "deleteAdmin").mockResolvedValue(undefined as any);

      const mockDeselectAll = vi.fn();
      const wrapper = mountTab();
      await flushPromises();

      vi.spyOn(wrapper.vm.__test.gridApi, "value", "get").mockReturnValue({
        getSelectedRows: () => [{ id: 2, username: "alice", super: false }],
        deselectAll: mockDeselectAll,
      } as any);
      wrapper.vm.__test.selectedCount.value = 1;

      await wrapper.vm.__test.confirmRemove();
      await flushPromises();

      // Called once on mount, once after remove
      expect(getAllSpy).toHaveBeenCalledTimes(2);
      expect(mockDeselectAll).toHaveBeenCalled();
      expect(wrapper.vm.__test.selectedCount.value).toBe(0);
    });

    it("shows error and keeps modal open when delete fails", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);
      vi.spyOn(auth, "deleteAdmin").mockRejectedValue(new Error("Forbidden"));

      const wrapper = mountTab();
      await flushPromises();

      vi.spyOn(wrapper.vm.__test.gridApi, "value", "get").mockReturnValue({
        getSelectedRows: () => [{ id: 2, username: "alice", super: false }],
        deselectAll: vi.fn(),
      } as any);
      wrapper.vm.__test.selectedCount.value = 1;
      wrapper.vm.__test.openRemoveConfirm();
      await wrapper.vm.$nextTick();

      await wrapper.vm.__test.confirmRemove();
      await flushPromises();

      expect(wrapper.vm.__test.removeConfirmError.value).toBeTruthy();
      expect(wrapper.vm.__test.removeConfirmOpen.value).toBe(true);
    });

    it("sets removeConfirmLoading true during deletion", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);

      let resolve: Function;
      const pending = new Promise((r) => (resolve = r));
      vi.spyOn(auth, "deleteAdmin").mockReturnValue(pending as any);

      const wrapper = mountTab();
      await flushPromises();

      vi.spyOn(wrapper.vm.__test.gridApi, "value", "get").mockReturnValue({
        getSelectedRows: () => [{ id: 2, username: "alice", super: false }],
        deselectAll: vi.fn(),
      } as any);
      wrapper.vm.__test.selectedCount.value = 1;

      const confirmPromise = wrapper.vm.__test.confirmRemove();
      expect(wrapper.vm.__test.removeConfirmLoading.value).toBe(true);

      resolve!(undefined);
      await confirmPromise;
      await flushPromises();

      expect(wrapper.vm.__test.removeConfirmLoading.value).toBe(false);
    });

    it("does not call deleteAdmin when no rows are selected", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);
      const deleteSpy = vi.spyOn(auth, "deleteAdmin").mockResolvedValue(undefined as any);

      const wrapper = mountTab();
      await flushPromises();

      vi.spyOn(wrapper.vm.__test.gridApi, "value", "get").mockReturnValue({
        getSelectedRows: () => [],
        deselectAll: vi.fn(),
      } as any);
      wrapper.vm.__test.selectedCount.value = 0;

      await wrapper.vm.__test.confirmRemove();
      await flushPromises();

      expect(deleteSpy).not.toHaveBeenCalled();
    });

    it("does not call deleteAdmin when gridApi is null", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);
      const deleteSpy = vi.spyOn(auth, "deleteAdmin").mockResolvedValue(undefined as any);

      const wrapper = mountTab();
      await flushPromises();

      // gridApi.value is null before onGridReady fires in the mock environment
      expect(wrapper.vm.__test.gridApi.value).toBeNull();

      await wrapper.vm.__test.confirmRemove();
      await flushPromises();

      expect(deleteSpy).not.toHaveBeenCalled();
    });

    it("does not throw when gridApi is null during onSuccess deselectAll", async () => {
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);
      vi.spyOn(auth, "deleteAdmin").mockResolvedValue(undefined as any);

      const wrapper = mountTab();
      await flushPromises();

      expect(wrapper.vm.__test.gridApi.value).toBeNull();
      await expect(wrapper.vm.__test.confirmRemove()).resolves.not.toThrow();
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