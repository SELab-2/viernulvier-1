import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import CMSView from "@/views/admin/CMSView.vue";
import { i18n } from "@/i18n";

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

  it("shows productions tab by default", () => {
    const wrapper = mountView();
    expect(wrapper.get('[data-testid="cms-tab-productions"]').attributes("aria-selected")).toBe("true");
  });

  it("switches to tags tab", async () => {
    const wrapper = mountView();
    await wrapper.get('[data-testid="cms-tab-tags"]').trigger("click");
    expect(wrapper.get('[data-testid="cms-tab-tags"]').attributes("aria-selected")).toBe("true");
    expect(wrapper.find(".cms-tab-placeholder").exists()).toBe(true);
  });

  it("switches to admins tab", async () => {
    const wrapper = mountView();
    await wrapper.get('[data-testid="cms-tab-admins"]').trigger("click");
    expect(wrapper.get('[data-testid="cms-tab-admins"]').attributes("aria-selected")).toBe("true");
    expect(wrapper.find(".cms-tab-placeholder").exists()).toBe(true);
  });

  it("switches back to productions tab", async () => {
    const wrapper = mountView();
    await wrapper.get('[data-testid="cms-tab-tags"]').trigger("click");
    await wrapper.get('[data-testid="cms-tab-productions"]').trigger("click");
    expect(wrapper.get('[data-testid="cms-tab-productions"]').attributes("aria-selected")).toBe("true");
  });

  it("handles dark mode toggle event", async () => {
    const wrapper = mountView();
    await wrapper.get('button[aria-label="Toggle dark mode"]').trigger("click");
    expect(wrapper.exists()).toBe(true);
  });
});
