import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { i18n } from "@/i18n";
import StatsSection from "@/components/home/StatsSection.vue";

// ─── Mock API services ──────────────────────────────────────────────────────

vi.mock("@/services/productions", () => ({
  getProductions: vi.fn().mockResolvedValue(
    Array.from({ length: 245 }, (_, i) => ({ id: i + 1 })),
  ),
}));

vi.mock("@/services/events", () => ({
  getEvents: vi.fn().mockResolvedValue([
    { id: 1, starts_at: "1982-09-15T20:00:00" },
    { id: 2, starts_at: "2024-03-10T20:00:00" },
    { id: 3, starts_at: "1998-06-01T20:00:00" },
  ]),
}));

vi.mock("@/services/tags", () => ({
  getTags: vi.fn().mockResolvedValue(
    Array.from({ length: 18 }, (_, i) => ({ id: i + 1 })),
  ),
}));

// ─── Helpers ──────────────���─────────────────────────────────────────────────

async function mountStats() {
  const wrapper = mount(StatsSection, {
    global: { plugins: [i18n] },
  });
  await flushPromises();
  return wrapper;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("StatsSection.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without errors", async () => {
    const wrapper = await mountStats();
    expect(wrapper.exists()).toBe(true);
  });

  it("renders a section element", async () => {
    const wrapper = await mountStats();
    expect(wrapper.find("section").exists()).toBe(true);
  });

  it("renders exactly four stat items", async () => {
    const wrapper = await mountStats();
    const grid = wrapper.find("div.grid");
    expect(grid.findAll(":scope > div")).toHaveLength(4);
  });

  it("renders the productions count from the API", async () => {
    const wrapper = await mountStats();
    expect(wrapper.text()).toContain("245");
  });

  it("renders the events count from the API", async () => {
    const wrapper = await mountStats();
    expect(wrapper.text()).toContain("3");
  });

  it("renders the computed years of history", async () => {
    const wrapper = await mountStats();
    const expectedYears = new Date().getFullYear() - 1982;
    expect(wrapper.text()).toContain(String(expectedYears));
  });

  it("renders the genres count from the API", async () => {
    const wrapper = await mountStats();
    expect(wrapper.text()).toContain("18");
  });

  it("renders four translated stat labels", async () => {
    const wrapper = await mountStats();
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
