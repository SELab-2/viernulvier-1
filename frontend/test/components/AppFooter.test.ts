import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "@/i18n";
import AppFooter from "@/components/AppFooter.vue";

function mountFooter() {
  return mount(AppFooter, {
    global: { plugins: [i18n] },
  });
}

describe("AppFooter.vue", () => {
  // ── Rendering ──────────────────────────────────────────────────────────────

  it("renders without errors", () => {
    const wrapper = mountFooter();
    expect(wrapper.exists()).toBe(true);
  });

  it("renders the current year in the copyright text", () => {
    const wrapper = mountFooter();
    const year = new Date().getFullYear().toString();
    expect(wrapper.text()).toContain(year);
  });

  it("renders VierNulVier in the copyright text", () => {
    const wrapper = mountFooter();
    expect(wrapper.text()).toContain("VierNulVier");
  });

  it("renders three translated footer links", () => {
    const wrapper = mountFooter();
    const links = wrapper.findAll("a.footer-link").map((l) => l.text());
    // Links exist and are non-empty (locale-agnostic)
    expect(links).toHaveLength(3);
    expect(links.every((l) => l.length > 0)).toBe(true);
  });

  it("renders the Contact link (same in all locales)", () => {
    const wrapper = mountFooter();
    const links = wrapper.findAll("a.footer-link").map((l) => l.text());
    expect(links).toContain("Contact");
  });

  it("renders exactly three footer links", () => {
    const wrapper = mountFooter();
    expect(wrapper.findAll("a.footer-link")).toHaveLength(3);
  });

  it("renders a footer element", () => {
    const wrapper = mountFooter();
    expect(wrapper.find("footer").exists()).toBe(true);
  });
});
