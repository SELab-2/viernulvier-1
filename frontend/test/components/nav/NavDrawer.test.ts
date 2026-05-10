import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import NavDrawer from "@/components/nav/NavDrawer.vue";

function mountDrawer(open = false, slotContent = "<span class='slot-content'>item</span>") {
  return mount(NavDrawer, {
    props: { open },
    slots: { default: slotContent },
    global: {
      stubs: {
        Transition: {
          template: `<slot />`,
        },
      },
    },
  });
}

describe("NavDrawer.vue", () => {
  // ── Rendering ──────────────────────────────────────────────────────────────

  it("does not render the drawer when closed", () => {
    const wrapper = mountDrawer(false);
    expect(wrapper.find(".mobile-drawer").exists()).toBe(false);
  });

  it("renders the drawer when open", () => {
    const wrapper = mountDrawer(true);
    expect(wrapper.find(".mobile-drawer").exists()).toBe(true);
  });

  it("renders slot content when open", () => {
    const wrapper = mountDrawer(true);
    expect(wrapper.find(".slot-content").exists()).toBe(true);
  });

  it("does not render slot content when closed", () => {
    const wrapper = mountDrawer(false);
    expect(wrapper.find(".slot-content").exists()).toBe(false);
  });

  // ── Reactivity ─────────────────────────────────────────────────────────────

  it("shows the drawer when open prop changes to true", async () => {
    const wrapper = mountDrawer(false);
    expect(wrapper.find(".mobile-drawer").exists()).toBe(false);
    await wrapper.setProps({ open: true });
    expect(wrapper.find(".mobile-drawer").exists()).toBe(true);
  });

  it("hides the drawer when open prop changes to false", async () => {
    const wrapper = mountDrawer(true);
    expect(wrapper.find(".mobile-drawer").exists()).toBe(true);
    await wrapper.setProps({ open: false });
    expect(wrapper.find(".mobile-drawer").exists()).toBe(false);
  });

  // ── Overlay ─────────────────────────────────────────────────────────────────

  it("renders the overlay when open", () => {
    const wrapper = mountDrawer(true);
    expect(wrapper.find(".fixed.inset-0").exists()).toBe(true);
  });

  it("does not render the overlay when closed", () => {
    const wrapper = mountDrawer(false);
    expect(wrapper.find(".fixed.inset-0").exists()).toBe(false);
  });

  it("emits close when the overlay is clicked", async () => {
    const wrapper = mountDrawer(true);
    await wrapper.find(".fixed.inset-0").trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(1);
  });
});