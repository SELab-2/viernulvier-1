import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import CMSView from "@/views/admin/CMSView.vue";
import { i18n } from "@/i18n";

type CmsTab = "productions" | "tags" | "admins";

describe("CMSView", () => {
  function mountView() {
    return mount(CMSView, {
      global: {
        plugins: [i18n],
        stubs: {
          AdminNavbar: {
            template: '<button aria-label="Toggle dark mode" @click="$emit(\'toggle-dark\')">toggle</button>',
          },
          AppFooter: true,
          AgGridVue: true,
        },
      },
    });
  }

  function tabSelector(tab: CmsTab): string {
    return `[data-testid="cms-tab-${tab}"]`;
  }

  async function clickTab(wrapper: ReturnType<typeof mountView>, tab: CmsTab): Promise<void> {
    await wrapper.get(tabSelector(tab)).trigger("click");
  }

  function expectSelected(wrapper: ReturnType<typeof mountView>, tab: CmsTab): void {
    expect(wrapper.get(tabSelector(tab)).attributes("aria-selected")).toBe("true");
  }

  it("shows productions tab by default", () => {
    const wrapper = mountView();
    expectSelected(wrapper, "productions");
  });

  it.each<CmsTab>(["tags", "admins"])("switches to %s tab", async (tab) => {
    const wrapper = mountView();
    await clickTab(wrapper, tab);
    expectSelected(wrapper, tab);
  });

  it("switches back to productions tab", async () => {
    const wrapper = mountView();
    await clickTab(wrapper, "tags");
    await clickTab(wrapper, "productions");
    expectSelected(wrapper, "productions");
  });

  it("handles dark mode toggle event", async () => {
    const wrapper = mountView();
    await wrapper.get('button[aria-label="Toggle dark mode"]').trigger("click");
    expect(wrapper.exists()).toBe(true);
  });
});
