import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "@/i18n";
import ProductionEventRow from "@/components/production/ProductionEventRow.vue";
import type { EnrichedEvent } from "@/composables/useProductionEvents";
import type { Hall } from "@viernulvier/shared";

const hallFull: Hall = {
  id: 1,
  old_id: null,
  address: "Platteberg 24",
  name: { nl: "Wintercircus" },
};

function makeEvent(overrides: Partial<EnrichedEvent> & Record<string, unknown> = {}): EnrichedEvent {
  return {
    id: 1,
    old_id: null,
    starts_at: new Date("2026-05-01T20:00:00"),
    ends_at: new Date("2026-05-01T22:00:00"),
    doors_at: new Date("2026-05-01T19:00:00"),
    info: {},
    production: 1,
    hall: hallFull,
    minPrice: 10,
    maxPrice: 20,
    ...overrides,
  } as EnrichedEvent;
}

function mountRow(event: EnrichedEvent) {
  return mount(ProductionEventRow, {
    props: { event },
    global: { plugins: [i18n] },
  });
}

describe("ProductionEventRow.vue", () => {
  it("shows end-time segment when ends_at differs from starts_at", () => {
    const w = mountRow(makeEvent());
    expect(w.find('[data-test="event-end-time"]').exists()).toBe(true);
  });

  it("hides end-time when ends matches start time", () => {
    const t = new Date("2026-05-01T20:00:00");
    const w = mountRow(
      makeEvent({
        ends_at: t,
        minPrice: null,
        maxPrice: null,
      }),
    );
    expect(w.find('[data-test="event-end-time"]').exists()).toBe(false);
  });

  it("hides end-time when ends_at is absent", () => {
    const w = mountRow(
      makeEvent({
        ends_at: null as unknown as undefined,
        minPrice: null,
        maxPrice: null,
      }),
    );
    expect(w.find('[data-test="event-end-time"]').exists()).toBe(false);
  });

  it("shows hall connector block when name and address exist", () => {
    const w = mountRow(makeEvent({ minPrice: null, maxPrice: null }));
    expect(w.text()).toContain("Wintercircus");
    expect(w.find('[data-test="event-address"]').text()).toContain("Platteberg");
  });

  it("shows hall line without address paragraph when address missing", () => {
    const w = mountRow(
      makeEvent({
        hall: {
          ...hallFull,
          address: null,
        },
        minPrice: null,
        maxPrice: null,
      }),
    );
    expect(w.text()).toContain("Wintercircus");
    expect(w.find('[data-test="event-address"]').exists()).toBe(false);
  });

  it("shows address-only line when localized name empty", () => {
    const w = mountRow(
      makeEvent({
        hall: { ...hallFull, name: {}, address: "Alleen adres" },
        minPrice: null,
        maxPrice: null,
      }),
    );
    expect(w.text()).not.toContain("Wintercircus");
    expect(w.find('[data-test="event-address"]').text()).toContain("Alleen adres");
  });

  it("renders no hall block when name and address both empty", () => {
    const w = mountRow(
      makeEvent({
        hall: {
          ...hallFull,
          name: {},
          address: null,
        },
        minPrice: null,
        maxPrice: null,
      }),
    );
    expect(w.find('[data-test="event-address"]').exists()).toBe(false);
    expect(w.text()).not.toContain("Wintercircus");
  });

  it("shows min–max when prices differ", () => {
    const w = mountRow(makeEvent({ minPrice: 5, maxPrice: 12 }));
    expect(w.text().replace(/\s/g, "")).toContain("€5");
    expect(w.text().replace(/\s/g, "")).toContain("€12");
  });

  it("shows single price when min equals max", () => {
    const w = mountRow(makeEvent({ minPrice: 15, maxPrice: 15 }));
    expect(w.text()).toContain("€15");
  });

  it("hides price column when minPrice is null", () => {
    const w = mountRow(makeEvent({ minPrice: null, maxPrice: null }));
    expect(w.text()).not.toContain("€");
  });
});
