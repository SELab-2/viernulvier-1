import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "@/i18n";
import StatsSection from "@/components/home/StatsSection.vue";

// ─── Helpers ────────────────────────────────────────────────────────────────

function mountStats() {
  return mount(StatsSection, {
    global: { plugins: [i18n] },
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

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
    const grid = wrapper.find("div.grid");
    expect(grid.findAll(":scope > div")).toHaveLength(4);
  });

  it("renders the static placeholder values", () => {
    const wrapper = mountStats();
    // All stats are currently 0 (manual placeholders)
    const text = wrapper.text();
    expect(text).toContain("0");
  });

  it("renders four translated stat labels", () => {
    const wrapper = mountStats();
    const grid = wrapper.find("div.grid");
    const items = grid.findAll(":scope > div");
    expect(items).toHaveLength(4);
    items.forEach((item) => {
      const spans = item.findAll("span");
      expect(spans.length).toBeGreaterThanOrEqual(2);
      // Last span is the label — should be non-empty
      expect(spans[spans.length - 1]!.text().length).toBeGreaterThan(0);
    });
  });
});
