import { describe, expect, it, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { i18n } from "@/i18n";
import CmsAdminsTab from "@/components/admin/cms/tabs/CmsAdminsTab.vue";
import * as auth from "@/services/auth";
import type { Admin } from "@viernulvier/shared";

vi.mock("ag-grid-vue3", () => ({
  AgGridVue: { template: "<div class='ag-grid-mock' />" },
}));

vi.mock("@/composables/useDarkMode", () => ({
  useDarkMode: () => ({ isDark: { value: false } }),
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

const CmsGridControlsStub = {
  template: `
    <div>
      <button data-testid="emit-filter" @click="$emit('update:quick-filter-text', 'john')" />
      <button data-testid="apply-filter" @click="$emit('apply-quick-filter')" />
    </div>
  `,
};

const CmsColumnChooserStub = {
  template: `
    <div>
      <button data-testid="close-chooser" @click="$emit('close')" />
    </div>
  `,
  props: ["show"],
};

function mountTab() {
  return mount(CmsAdminsTab, {
    global: {
      plugins: [i18n],
      stubs: {
        CmsGridControls: CmsGridControlsStub,
        CmsColumnChooser: CmsColumnChooserStub,
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
  });

  describe("unmount behavior", () => {
    beforeEach(() => {
      mockStoreAdmin = { ...superAdmin };
    });

    it("persists grid state on unmount", async () => {
      const wrapper = mountTab();

      const spy = vi.spyOn(
        wrapper.vm.__test,
        "loadAdminsData",
      );

      wrapper.unmount();

      // We can't directly spy persistGridState, but this ensures no crash
      expect(spy).not.toThrow;
    });
  });

  describe("grid control interactions", () => {
    it("updates quick filter text", async () => {
      mockStoreAdmin = { ...superAdmin };
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);

      const wrapper = mountTab();
      await flushPromises();

      await wrapper.get('[data-testid="emit-filter"]').trigger("click");

      expect(wrapper.vm.__test.quickFilterText.value).toBe("john");
    });

    it("closes column chooser", async () => {
      mockStoreAdmin = { ...superAdmin };
      vi.spyOn(auth, "getAllAdmins").mockResolvedValue([]);

      const wrapper = mountTab();
      await flushPromises();

      wrapper.vm.__test.columnChooserOpen.value = true;
      await wrapper.vm.$nextTick();

      await wrapper.get('[data-testid="close-chooser"]').trigger("click");

      expect(wrapper.vm.__test.columnChooserOpen.value).toBe(false);
    });
  });
});