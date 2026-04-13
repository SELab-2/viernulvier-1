import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { defineComponent } from "vue";
import { useProductionEvents } from "@/composables/useProductionEvents";

// ─── Mock services ────────────────────────────────────────────────────────────
const mockGetEvents = vi.fn();
const mockGetHalls = vi.fn();

vi.mock("@/services/events", () => ({ getEvents: (...a: any[]) => mockGetEvents(...a) }));
vi.mock("@/services/halls",  () => ({ getHalls:  (...a: any[]) => mockGetHalls(...a)  }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mountComposable(productionId = 1) {
  let result: ReturnType<typeof useProductionEvents>;

  mount(
    defineComponent({
      setup() {
        result = useProductionEvents(productionId);
        return {};
      },
      template: "<div />",
    }),
  );

  return result!;
}

const makeHall = (id: number) => ({
  id,
  old_id: null,
  address: `Street ${id}`,
  name: { nl: `Zaal ${id}`, en: `Hall ${id}`, fr: `Salle ${id}` },
});

const makeEvent = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  old_id: null,
  starts_at: new Date("2024-06-01T19:00:00"),
  ends_at:   new Date("2024-06-01T21:30:00"),
  doors_at:  new Date("2024-06-01T18:30:00"),
  info: {},
  production: 1,
  hall: 10,
  price: [],
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("useProductionEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetHalls.mockResolvedValue([]);
    mockGetEvents.mockResolvedValue([]);
  });

  // ── Initial state ────────────────────────────────────────────────────────────
  describe("initial state", () => {
    it("loading is true before the requests settle", () => {
      mockGetEvents.mockReturnValue(new Promise(() => {}));
      mockGetHalls.mockReturnValue(new Promise(() => {}));

      const { loading } = mountComposable();
      expect(loading.value).toBe(true);
    });

    it("events is an empty array before the requests settle", () => {
      mockGetEvents.mockReturnValue(new Promise(() => {}));
      mockGetHalls.mockReturnValue(new Promise(() => {}));

      const { events } = mountComposable();
      expect(events.value).toEqual([]);
    });
  });

  // ── After successful fetch ────────────────────────────────────────────────────
  describe("after a successful fetch", () => {
    it("loading becomes false", async () => {
      const { loading } = mountComposable();
      await flushPromises();
      expect(loading.value).toBe(false);
    });

    it("calls getEvents with the correct productionId", async () => {
      mountComposable(42);
      await flushPromises();
      expect(mockGetEvents).toHaveBeenCalledWith(42);
    });

    it("calls getEvents and getHalls in parallel (both called once)", async () => {
      mountComposable(7);
      await flushPromises();
      expect(mockGetEvents).toHaveBeenCalledTimes(1);
      expect(mockGetHalls).toHaveBeenCalledTimes(1);
    });
  });

  // ── enrichedEvents — hall matching ───────────────────────────────────────────
  describe("enrichedEvents — hall matching", () => {
    it("attaches the matching hall object when ids align", async () => {
      const hall = makeHall(10);
      mockGetEvents.mockResolvedValue([makeEvent({ hall: 10 })]);
      mockGetHalls.mockResolvedValue([hall]);

      const { events } = mountComposable();
      await flushPromises();

      expect(events.value[0].hall).toEqual(hall);
    });

    it("sets hall to null when no matching hall is found", async () => {
      mockGetEvents.mockResolvedValue([makeEvent({ hall: 99 })]);
      mockGetHalls.mockResolvedValue([makeHall(10)]);

      const { events } = mountComposable();
      await flushPromises();

      expect(events.value[0].hall).toBeNull();
    });

    it("sets hall to null when halls list is empty", async () => {
      mockGetEvents.mockResolvedValue([makeEvent({ hall: 10 })]);
      mockGetHalls.mockResolvedValue([]);

      const { events } = mountComposable();
      await flushPromises();

      expect(events.value[0].hall).toBeNull();
    });
  });

  // ── enrichedEvents — price calculation ──────────────────────────────────────
  describe("enrichedEvents — price calculation", () => {
    it("returns minPrice and maxPrice as null when price array is empty", async () => {
      mockGetEvents.mockResolvedValue([makeEvent({ price: [] })]);

      const { events } = mountComposable();
      await flushPromises();

      expect(events.value[0].minPrice).toBeNull();
      expect(events.value[0].maxPrice).toBeNull();
    });

    it("returns minPrice and maxPrice as null when price is undefined", async () => {
      mockGetEvents.mockResolvedValue([makeEvent({ price: undefined })]);

      const { events } = mountComposable();
      await flushPromises();

      expect(events.value[0].minPrice).toBeNull();
      expect(events.value[0].maxPrice).toBeNull();
    });

    it("calculates correct min and max from a single price", async () => {
      mockGetEvents.mockResolvedValue([makeEvent({ price: [{ amount: 15 }] })]);

      const { events } = mountComposable();
      await flushPromises();

      expect(events.value[0].minPrice).toBe(15);
      expect(events.value[0].maxPrice).toBe(15);
    });

    it("calculates correct min and max from multiple prices", async () => {
      mockGetEvents.mockResolvedValue([
        makeEvent({ price: [{ amount: 20 }, { amount: 5 }, { amount: 12 }] }),
      ]);

      const { events } = mountComposable();
      await flushPromises();

      expect(events.value[0].minPrice).toBe(5);
      expect(events.value[0].maxPrice).toBe(20);
    });

    it("handles identical prices (min === max)", async () => {
      mockGetEvents.mockResolvedValue([
        makeEvent({ price: [{ amount: 10 }, { amount: 10 }] }),
      ]);

      const { events } = mountComposable();
      await flushPromises();

      expect(events.value[0].minPrice).toBe(10);
      expect(events.value[0].maxPrice).toBe(10);
    });
  });

  // ── enrichedEvents — multiple events ────────────────────────────────────────
  describe("enrichedEvents — multiple events", () => {
    it("enriches every event independently", async () => {
      const hall10 = makeHall(10);
      const hall20 = makeHall(20);
      mockGetHalls.mockResolvedValue([hall10, hall20]);
      mockGetEvents.mockResolvedValue([
        makeEvent({ id: 1, hall: 10, price: [{ amount: 8 }] }),
        makeEvent({ id: 2, hall: 20, price: [{ amount: 25 }, { amount: 30 }] }),
        makeEvent({ id: 3, hall: 99, price: [] }),
      ]);

      const { events } = mountComposable();
      await flushPromises();

      expect(events.value[0].hall).toEqual(hall10);
      expect(events.value[0].minPrice).toBe(8);
      expect(events.value[0].maxPrice).toBe(8);

      expect(events.value[1].hall).toEqual(hall20);
      expect(events.value[1].minPrice).toBe(25);
      expect(events.value[1].maxPrice).toBe(30);

      expect(events.value[2].hall).toBeNull();
      expect(events.value[2].minPrice).toBeNull();
      expect(events.value[2].maxPrice).toBeNull();
    });
  });


});