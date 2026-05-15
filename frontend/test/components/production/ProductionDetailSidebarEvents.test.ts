import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "@/i18n";
import ProductionDetailSidebarEvents from "@/components/production/ProductionDetailSidebarEvents.vue";
import ProductionEventRow from "@/components/production/ProductionEventRow.vue";
import type { EnrichedEvent } from "@/composables/useProductionEvents";
import type { Hall } from "@viernulvier/shared";

const hall: Hall = {
  id: 1,
  old_id: null,
  address: "St 1",
  name: { nl: "Hall" },
};

function makeEv(id: number, overrides: Partial<EnrichedEvent> = {}): EnrichedEvent {
  return {
    id,
    old_id: null,
    starts_at: new Date("2026-01-01T20:00:00"),
    ends_at: null,
    doors_at: null,
    info: {},
    production: 1,
    hall,
    minPrice: null,
    maxPrice: null,
    ...overrides,
  } as EnrichedEvent;
}

describe("ProductionDetailSidebarEvents.vue", () => {
  it("shows loading skeleton placeholders", () => {
    const w = mount(ProductionDetailSidebarEvents, {
      props: {
        events: [],
        loading: true,
        error: null,
      },
      global: { plugins: [i18n] },
    });
    expect(w.find(".animate-pulse").exists()).toBe(true);
    expect(w.findComponent(ProductionEventRow).exists()).toBe(false);
  });

  it("shows error copy and emits retry when the retry button is used", async () => {
    const w = mount(ProductionDetailSidebarEvents, {
      props: {
        events: [],
        loading: false,
        error: new Error("x"),
      },
      global: { plugins: [i18n] },
    });

    expect(w.text()).toContain("Opnieuw proberen");
    await w.find('button[type="button"]').trigger("click");
    expect(w.emitted("retry")).toBeTruthy();
  });

  it("lists empty-state message when there are no events", () => {
    const w = mount(ProductionDetailSidebarEvents, {
      props: {
        events: [],
        loading: false,
        error: null,
      },
      global: { plugins: [i18n] },
    });
    expect(w.text()).toContain("speeldata");
    expect(w.findComponent(ProductionEventRow).exists()).toBe(false);
  });

  it("renders an event row per item", () => {
    const w = mount(ProductionDetailSidebarEvents, {
      props: {
        events: [makeEv(1), makeEv(2)],
        loading: false,
        error: null,
      },
      global: { plugins: [i18n] },
    });
    expect(w.findAllComponents(ProductionEventRow).length).toBe(2);
  });

  it("shows toggle when events exceed collapsedLimit and expands slice", async () => {
    const evs = [makeEv(1), makeEv(2), makeEv(3), makeEv(4)];
    const w = mount(ProductionDetailSidebarEvents, {
      props: {
        events: evs,
        loading: false,
        error: null,
        collapsedLimit: 3,
      },
      global: { plugins: [i18n] },
    });
    expect(w.findAll('[data-test="event-row"]').length).toBe(3);
    expect(w.text()).toContain("evenementen");

    await w.find('button[type="button"].cursor-pointer').trigger("click");
    expect(w.findAll('[data-test="event-row"]').length).toBe(4);

    await w.find('button[type="button"].cursor-pointer').trigger("click");
    expect(w.findAll('[data-test="event-row"]').length).toBe(3);
  });

  it("does not render expand control when events within limit", () => {
    const w = mount(ProductionDetailSidebarEvents, {
      props: {
        events: [makeEv(1), makeEv(2)],
        loading: false,
        error: null,
        collapsedLimit: 4,
      },
      global: { plugins: [i18n] },
    });
    expect(w.findAllComponents(ProductionEventRow).length).toBe(2);
    expect(w.find("button.cursor-pointer").exists()).toBe(false);
  });
});
