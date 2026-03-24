import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "@/i18n";
import StatsSection from "@/components/home/StatsSection.vue";

function mountStats() {
  return mount(StatsSection, {
    global: { plugins: [i18n] },
  });
}

describe("StatsSection.vue", () => {
  it("renders without errors", () => {
    const wrapper = mountStats();
    expect(wrapper.exists()).toBe(true);
  });

  it("renders a section element", () => {
    const wrapper = mountStats();
    expect(wrapper.find("section").exists()).toBe(true);
  });

  it("renders exactly four stat items", () => {
    const wrapper = mountStats();
    // Each stat is a div inside the grid
    const grid = wrapper.find("div.grid");
    expect(grid.findAll("div")).toHaveLength(4);
  });

  it("renders the total records value", () => {
    const wrapper = mountStats();
    expect(wrapper.text()).toContain("12.482");
  });

  it("renders the years covered value", () => {
    const wrapper = mountStats();
    expect(wrapper.text()).toContain("42");
  });

  it("renders the original series value", () => {
    const wrapper = mountStats();
    expect(wrapper.text()).toContain("315");
  });

  it("renders the digitized works value", () => {
    const wrapper = mountStats();
    expect(wrapper.text()).toContain("8.200+");
  });

  it("renders four translated stat labels (locale-agnostic)", () => {
    const wrapper = mountStats();
    // Each stat item has a value span and a label span — just verify labels are non-empty
    const grid = wrapper.find("div.grid");
    const items = grid.findAll("div");
    expect(items).toHaveLength(4);
    items.forEach((item) => {
      const spans = item.findAll("span");
      expect(spans.length).toBeGreaterThanOrEqual(2);
      // Last span is the label
      expect(spans[spans.length - 1]!.text().length).toBeGreaterThan(0);
    });
  });
});
