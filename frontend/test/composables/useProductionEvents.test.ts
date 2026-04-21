import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { defineComponent } from "vue";

// ─── Mock services ────────────────────────────────────────────────────────────
const mockGetEvents = vi.fn();
const mockGetHalls = vi.fn();
const mockGetEventPrices = vi.fn();

vi.mock("@/services/events", () => ({
  getEvents: (...a: any[]) => mockGetEvents(...a),
}));

vi.mock("@/services/halls", () => ({
  getHalls: (...a: any[]) => mockGetHalls(...a),
}));

vi.mock("@/services/eventPrices", () => ({
  getEventPrices: (...a: any[]) => mockGetEventPrices(...a),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
import { useProductionEvents } from "@/composables/useProductionEvents";

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
  ends_at: new Date("2024-06-01T21:30:00"),
  doors_at: new Date("2024-06-01T18:30:00"),
  info: {},
  production: 1,
  hall: 10,
  ...overrides,
});

const makePrice = (eventId: number, amount: number) => ({
  event: eventId,
  amount,
});

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("useProductionEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEvents.mockResolvedValue([]);
    mockGetHalls.mockResolvedValue([]);
    mockGetEventPrices.mockResolvedValue([]);
  });

  // ── Initial state ────────────────────────────────────────────────────────────
  describe("initial state", () => {
    it("loading is true before the requests settle", () => {
      mockGetEvents.mockReturnValue(new Promise(() => {}));
      mockGetHalls.mockReturnValue(new Promise(() => {}));
      mockGetEventPrices.mockReturnValue(new Promise(() => {}));

      const { loading } = mountComposable();
      expect(loading.value).toBe(true);
    });

    it("events is an empty array before the requests settle", () => {
      mockGetEvents.mockReturnValue(new Promise(() => {}));
      mockGetHalls.mockReturnValue(new Promise(() => {}));
      mockGetEventPrices.mockReturnValue(new Promise(() => {}));

      const { events } = mountComposable();
      expect(events.value).toEqual([]);
    });
  });

  // ── After fetch ─────────────────────────────────────────────────────────────
  describe("after a successful fetch", () => {
    it("loading becomes false", async () => {
      const { loading } = mountComposable();
      await flushPromises();
      expect(loading.value).toBe(false);
    });

    it("calls getEvents with correct productionId", async () => {
      mountComposable(42);
      await flushPromises();
      expect(mockGetEvents).toHaveBeenCalledWith(42);
    });

    it("calls all services once", async () => {
      mountComposable();
      await flushPromises();

      expect(mockGetEvents).toHaveBeenCalledTimes(1);
      expect(mockGetHalls).toHaveBeenCalledTimes(1);
      expect(mockGetEventPrices).toHaveBeenCalledTimes(1);
    });

    it("sets error when a service fails", async () => {
      mockGetEvents.mockRejectedValue(new Error("events failed"));

      const { error, loading, events } = mountComposable();
      await flushPromises();

      expect(error.value).toBeInstanceOf(Error);
      expect(error.value?.message).toBe("events failed");

      expect(loading.value).toBe(false);
      expect(events.value).toEqual([]);
    });

    it("handles non-Error throws as unknown error", async () => {
      mockGetEvents.mockRejectedValue("boom");

      const { error } = mountComposable();
      await flushPromises();

      expect(error.value).toBeInstanceOf(Error);
      expect(error.value?.message).toBe("Unknown error");
    });

    it("retry triggers a new fetch", async () => {
      const { retry } = mountComposable();
      await flushPromises();

      expect(mockGetEvents).toHaveBeenCalledTimes(1);

      await retry();
      await flushPromises();

      expect(mockGetEvents).toHaveBeenCalledTimes(2);
    });
  });

  // ── Hall matching ───────────────────────────────────────────────────────────
  describe("enrichedEvents — hall matching", () => {
    it("attaches matching hall", async () => {
      const hall = makeHall(10);
      mockGetEvents.mockResolvedValue([makeEvent({ id: 1, hall: 10 })]);
      mockGetHalls.mockResolvedValue([hall]);

      const { events } = mountComposable();
      await flushPromises();

      expect(events.value[0].hall).toEqual(hall);
    });

    it("returns null if no match", async () => {
      mockGetEvents.mockResolvedValue([makeEvent({ id: 1, hall: 99 })]);
      mockGetHalls.mockResolvedValue([makeHall(10)]);

      const { events } = mountComposable();
      await flushPromises();

      expect(events.value[0].hall).toBeNull();
    });
  });

  // ── Price calculation ───────────────────────────────────────────────────────
  describe("enrichedEvents — price calculation", () => {
    it("returns null when no prices exist", async () => {
      mockGetEvents.mockResolvedValue([makeEvent({ id: 1 })]);
      mockGetEventPrices.mockResolvedValue([]);

      const { events } = mountComposable();
      await flushPromises();

      expect(events.value[0].minPrice).toBeNull();
      expect(events.value[0].maxPrice).toBeNull();
    });

    it("calculates min/max for single price", async () => {
      mockGetEvents.mockResolvedValue([makeEvent({ id: 1 })]);
      mockGetEventPrices.mockResolvedValue([
        makePrice(1, 15),
      ]);

      const { events } = mountComposable();
      await flushPromises();

      expect(events.value[0].minPrice).toBe(15);
      expect(events.value[0].maxPrice).toBe(15);
    });

    it("calculates min/max for multiple prices", async () => {
      mockGetEvents.mockResolvedValue([makeEvent({ id: 1 })]);
      mockGetEventPrices.mockResolvedValue([
        makePrice(1, 20),
        makePrice(1, 5),
        makePrice(1, 12),
      ]);

      const { events } = mountComposable();
      await flushPromises();

      expect(events.value[0].minPrice).toBe(5);
      expect(events.value[0].maxPrice).toBe(20);
    });

    it("handles identical prices", async () => {
      mockGetEvents.mockResolvedValue([makeEvent({ id: 1 })]);
      mockGetEventPrices.mockResolvedValue([
        makePrice(1, 10),
        makePrice(1, 10),
      ]);

      const { events } = mountComposable();
      await flushPromises();

      expect(events.value[0].minPrice).toBe(10);
      expect(events.value[0].maxPrice).toBe(10);
    });

    it("falls back to empty prices when getEventPrices fails", async () => {
      mockGetEvents.mockResolvedValue([makeEvent({ id: 1 })]);
      mockGetHalls.mockResolvedValue([makeHall(10)]);
      mockGetEventPrices.mockRejectedValue(new Error("fail prices"));

      const { events, error } = mountComposable();
      await flushPromises();

      expect(error.value).toBeNull();

      expect(events.value[0].minPrice).toBeNull();
      expect(events.value[0].maxPrice).toBeNull();
    });
  });

  // ── Multiple events ─────────────────────────────────────────────────────────
  describe("enrichedEvents — multiple events", () => {
    it("enriches each event independently", async () => {
      const hall10 = makeHall(10);
      const hall20 = makeHall(20);

      mockGetHalls.mockResolvedValue([hall10, hall20]);

      mockGetEvents.mockResolvedValue([
        makeEvent({ id: 1, hall: 10 }),
        makeEvent({ id: 2, hall: 20 }),
        makeEvent({ id: 3, hall: 99 }),
      ]);

      mockGetEventPrices.mockResolvedValue([
        makePrice(1, 8),
        makePrice(2, 25),
        makePrice(2, 30),
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
