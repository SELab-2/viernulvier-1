import { describe, it, expect, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import EventsSection from "@/components/production/EventsSection.vue";
import type { EnrichedEvent } from "@/composables/useProductionEvents";
import type { Hall } from "@viernulvier/shared";

const i18n = createI18n({
  legacy: false,
  locale: "nl",
  messages: {
    nl: {
      production: {
        events: {
          title: "Events",
          body: "Body text",
          show_all: "Toon alles",
          show_less: "Toon minder",
          remaining_more: "{count} meer",
        },
      },
    },
  },
});

function mountComponent(events: EnrichedEvent[] = []) {
  return mount(EventsSection, {
    props: { events },
    global: {
      plugins: [i18n],
    },
  });
}


const baseHall: Hall = {
  id: 1,
  old_id: null,
  address: "Street 1",
  name: { nl: "Main Hall" },
};


const makeEvent = (overrides: Partial<EnrichedEvent> = {}): EnrichedEvent => ({
  id: 1,
  old_id: null,

  starts_at: new Date("2026-01-01T20:00:00"),
  ends_at: new Date("2026-01-01T22:00:00"),
  doors_at: new Date("2026-01-01T19:00:00"),

  hall: baseHall,

  minPrice: 10,
  maxPrice: 20,

  production: {
    id: 1,
    title: { nl: "Test" },
  } as any,

  info: { nl: "Info" },
  price: [],

  ...overrides,
});

describe("ProductionEventsSection.vue", () => {
  afterEach(() => {
    i18n.global.locale.value = "nl";
  });

  // ─────────────────────────────
  // rendering basics
  // ─────────────────────────────

  it("renders title and body", () => {
    const wrapper = mountComponent([makeEvent()]);
    expect(wrapper.text()).toContain("Events");
    expect(wrapper.text()).toContain("Body text");
  });

  it("renders event hall + address", () => {
    const wrapper = mountComponent([
      makeEvent({
        hall: baseHall,
      }),
    ]);

    expect(wrapper.text()).toContain("Main Hall");
    expect(wrapper.text()).toContain("Street 1");
  });

  it("does not render hall address when missing", () => {
    const wrapper = mountComponent([
      makeEvent({
        hall: {
          ...baseHall,
          address: null as any,
        },
      }),
    ]);

    expect(wrapper.find('[data-test="event-address"]').exists()).toBe(false);
  });

  it("does not crash when hall name is null", () => {
    const wrapper = mountComponent([
      makeEvent({
        hall: {
          id: 1,
          old_id: null,
          address: "Street 1",
          name: null as any,
        },
      }),
    ]);

    expect(wrapper.text()).not.toContain("undefined");
  });

  it("renders empty string for empty language map", () => {
    const wrapper = mountComponent([
      makeEvent({
        hall: {
          ...baseHall,
          name: {} as any,
        },
      }),
    ]);

    expect(wrapper.text()).not.toContain("Main Hall");
  });

  it("shows end time only when different from start time", () => {
    const wrapper = mountComponent([
      makeEvent({
        starts_at: new Date("2026-01-01T20:00:00"),
        ends_at: new Date("2026-01-01T22:00:00"),
      }),
    ]);

    expect(wrapper.find('[data-test="event-end-time"]').exists()).toBe(true);
  });

  it("does not show end time when equal to start time", () => {
    const time = new Date("2026-01-01T20:00:00");

    const wrapper = mountComponent([
      makeEvent({
        starts_at: time,
        ends_at: time,
      }),
    ]);

    expect(wrapper.find('[data-test="event-end-time"]').exists()).toBe(false);
  });

  it("does not show end time when missing", () => {
    const wrapper = mountComponent([
      makeEvent({
        ends_at: null as any,
      }),
    ]);

    expect(wrapper.find('[data-test="event-end-time"]').exists()).toBe(false);
  });

  // ─────────────────────────────
  // show limit logic
  // ─────────────────────────────

  it("shows only SHOW_LIMIT events initially", () => {
    const wrapper = mountComponent([
      makeEvent({ id: 1 }),
      makeEvent({ id: 2 }),
      makeEvent({ id: 3 }),
      makeEvent({ id: 4 }),
    ]);

    expect(wrapper.findAll('[data-test="event-row"]').length).toBe(3);
  });

  it("shows toggle button when more than SHOW_LIMIT", () => {
    const wrapper = mountComponent([
      makeEvent(),
      makeEvent(),
      makeEvent(),
      makeEvent(),
    ]);

    expect(wrapper.find("button").exists()).toBe(true);
  });

  it("expands events when clicking button", async () => {
    const wrapper = mountComponent([
      makeEvent(),
      makeEvent(),
      makeEvent(),
      makeEvent(),
    ]);

    await wrapper.find("button").trigger("click");

    expect(wrapper.findAll('[data-test="event-row"]').length).toBe(4);
  });

  it("toggles back when clicking twice", async () => {
    const wrapper = mountComponent([
      makeEvent(),
      makeEvent(),
      makeEvent(),
      makeEvent(),
    ]);

    const button = wrapper.find("button");

    await button.trigger("click");
    await button.trigger("click");

    expect(wrapper.findAll('[data-test="event-row"]').length).toBe(3);
  });

  // ─────────────────────────────
  // price logic
  // ─────────────────────────────

  it("renders no price when null", () => {
    const wrapper = mountComponent([
      makeEvent({ minPrice: null, maxPrice: null }),
    ]);

    expect(wrapper.text()).toContain("€ —");
  });

  it("renders price range", () => {
    const wrapper = mountComponent([
      makeEvent({ minPrice: 10, maxPrice: 20 }),
    ]);

    expect(wrapper.text()).toContain("10");
    expect(wrapper.text()).toContain("20");
  });

  it("renders single price when equal", () => {
    const wrapper = mountComponent([
      makeEvent({ minPrice: 15, maxPrice: 15 }),
    ]);

    expect(wrapper.text()).toContain("15");
  });
});
