import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import NavHamburger from "@/components/nav/NavHamburger.vue";

function mountHamburger(open = false) {
  return mount(NavHamburger, { props: { open } });
}

describe("NavHamburger.vue", () => {
  // ── Rendering ──────────────────────────────────────────────────────────────

  it("renders a button with three spans", () => {
    const wrapper = mountHamburger();
    expect(wrapper.find("button.hamburger").exists()).toBe(true);
    expect(wrapper.findAll("button.hamburger span")).toHaveLength(3);
  });

  it("sets aria-expanded to false when closed", () => {
    const wrapper = mountHamburger(false);
    expect(wrapper.find("button").attributes("aria-expanded")).toBe("false");
  });

  it("sets aria-expanded to true when open", () => {
    const wrapper = mountHamburger(true);
    expect(wrapper.find("button").attributes("aria-expanded")).toBe("true");
  });

  it("has the correct aria-label", () => {
    const wrapper = mountHamburger();
    expect(wrapper.find("button").attributes("aria-label")).toBe("Toggle menu");
  });

  // ── Interaction ────────────────────────────────────────────────────────────

  it("emits click when the button is clicked", async () => {
    const wrapper = mountHamburger();
    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("click")).toBeTruthy();
  });

  it("emits click exactly once per click", async () => {
    const wrapper = mountHamburger();
    await wrapper.find("button").trigger("click");
    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("click")).toHaveLength(2);
  });
});