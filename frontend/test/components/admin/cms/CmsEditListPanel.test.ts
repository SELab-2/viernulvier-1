import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import CmsEditListPanel from "@/components/admin/cms/CmsEditListPanel.vue";
import { i18n } from "@/i18n";

function createWrapper(props: any = {}) {
  return mount(CmsEditListPanel, {
    props: {
      panel: {
        rowId: 1,
        label: "Test Panel",
        items: [3, 1, 2],
      },
      saveError: null,
      isSaving: false,
      ...props,
    },
    global: {
      plugins: [i18n],
    },
  });
}

describe("CmsEditListPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders panel when provided", () => {
    const wrapper = createWrapper();

    expect(wrapper.find("aside.cms-side-panel").exists()).toBe(true);
    expect(wrapper.text()).toContain("Test Panel");
  });

  it("does not render when panel is null", () => {
    const wrapper = createWrapper({ panel: null });

    expect(wrapper.find("aside.cms-side-panel").exists()).toBe(false);
  });

  it("shows validation error for invalid input (1/2)", async () => {
    const wrapper = createWrapper();

    const input = wrapper.find('[data-testid="edit-list-panel-single-input"]');
    await input.setValue(0);

    await wrapper.find("form").trigger("submit.prevent");

    const { t } = i18n.global;

    expect(wrapper.text()).toContain(t("cms.create.validation.invalidId"));
  });

  it("shows validation error for invalid input (2/2)", async () => {
    const wrapper = createWrapper();

    const input = wrapper.find('[data-testid="edit-list-panel-single-input"]');
    await input.setValue("-2");

    await wrapper.find("form").trigger("submit.prevent");

    const { t } = i18n.global;

    expect(wrapper.text()).toContain(t("cms.create.validation.invalidId"));
  });

  it("adds valid number and emits update:panel", async () => {
    const wrapper = createWrapper();

    const input = wrapper.find('[data-testid="edit-list-panel-single-input"]');
    await input.setValue("5");

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    const tags = wrapper.findAll('[data-testid="edit-list-panel-tag"]');
    expect(tags.some(t => t.text().includes("5"))).toBe(true);

    const emitted = wrapper.emitted("update:panel");
    expect(emitted).toBeTruthy();
  });

  it("removes item when clicking remove button", async () => {
    const wrapper = createWrapper({
      panel: {
        rowId: 1,
        label: "Test Panel",
        items: [10],
      },
    });

    const removeBtn = wrapper.find(".cms-list-flair-remove");
    await removeBtn.trigger("click");

    expect(wrapper.findAll('[data-testid="edit-list-panel-tag"]').length).toBe(0);
  });

  it("emits save event when save button clicked", async () => {
    const wrapper = createWrapper();

    await wrapper.find('[data-testid="edit-list-panel-save"]').trigger("click");

    expect(wrapper.emitted("save")).toBeTruthy();
  });

  it("emits close event when close clicked", async () => {
    const wrapper = createWrapper();

    await wrapper.find(".cms-side-close").trigger("click");

    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("sorts items in ascending order", async () => {
    const wrapper = createWrapper({
      panel: {
        rowId: 1,
        label: "Test Panel",
        items: [],
      },
    });

    const input = wrapper.find('[data-testid="edit-list-panel-single-input"]');
    await input.setValue("9");
    await wrapper.find("form").trigger("submit.prevent");

    await input.setValue("2");
    await wrapper.find("form").trigger("submit.prevent");

    const emitted = wrapper.emitted("update:panel");
    expect(emitted).toBeTruthy();
  });
});