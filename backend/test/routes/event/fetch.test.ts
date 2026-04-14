import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import type { FastifyInstance } from "fastify";

import { buildServer } from "@/server.js";
import type { EventPrice, EventWithoutPrice } from "@viernulvier/shared/index.js";

let server: FastifyInstance;
let storedEventPrices: EventPrice[];
let sessionCookie: string;

const baseMockEvent: EventWithoutPrice = {
  id: 1,
  starts_at: new Date("2026-01-01T18:00:00.000Z"),
  ends_at: new Date("2026-01-01T20:00:00.000Z"),
  production: 10,
  hall: 3,
  doors_at: new Date("2026-01-01T17:30:00.000Z"),
  info: { nl: "Info mock 1" },
  old_id: 12345,
};

const metaData = {
  created_at: new Date("2025-12-31T09:00:00.000Z"),
  updated_at: new Date("2026-01-01T09:00:00.000Z"),
  created_by: 7,
  updated_by: 8,
};

const mockEvents: EventWithoutPrice[] = [
  baseMockEvent,
  { ...baseMockEvent, id: 2, production: 11, hall: 4, info: { nl: "Info mock 2" }, old_id: 12346 },
  { ...baseMockEvent, id: 3, production: 12, hall: 5, info: { nl: "Info mock 3" }, old_id: 12347 },
];

const mockInvalidEvent: EventWithoutPrice = {
  ...baseMockEvent,
  id: 500,
  hall: "invalid" as unknown as number,
  old_id: 12348,
};

const mockEventPrices: EventPrice[] = [
  { id: 1, event: 1, amount: 25.50},
  { id: 2, event: 2, amount: 30.00},
  { id: 3, event: 3, amount: 22.75},
  { id: 4, event: 1, amount: 15.00},
];

beforeAll(async () => {
  server = await buildServer();
  storedEventPrices = structuredClone(mockEventPrices);
  sessionCookie = server.jwt.sign({ id: 1, username: "TestAdmin" });


  server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {

    // Handle single event with metadata (created_at, updated_at fields)
    if (query.includes("created_at") && query.includes("updated_at") && query.includes("WHERE id = $1")) {
      const id: number = params?.[0] as number;
      if (id === 500) {
        return Promise.resolve({ rows: [mockInvalidEvent] });
      }
      if (id > 0 && id <= mockEvents.length) {
        const eventWithoutPrice = { ...mockEvents[Number(id) - 1], ...metaData };
        const event = { ...eventWithoutPrice, price: storedEventPrices.filter(p => p["event"] === id).map(p => p.id) };

        return Promise.resolve({ rows: [event] });
      }

      return Promise.resolve({ rows: [] });
    }

    if (query.includes("ANY($1::int[])") && query.includes("production")) {
      const prodIds = params?.[0] as number[];
      const filtered = mockEvents.filter((e) => prodIds.includes(e.production));
      const rows = filtered.map((event) => ({
        ...event,
        price: storedEventPrices.filter((p) => p["event"] === event.id).map((p) => p.id),
      }));
      return Promise.resolve({ rows });
    }

    if (query.includes("WHERE production = $1") && !query.includes("ANY($1::int[])")) {
      const prodId: number = params?.[0] as number;
      const filtered = mockEvents.filter((e) => e.production === prodId);
      const rows = filtered.map((event) => ({
        ...event,
        price: storedEventPrices.filter((p) => p["event"] === event.id).map((p) => p.id),
      }));
      return Promise.resolve({ rows });
    }

    if (query.includes("WHERE old_id = $1")) {
      const oldId: number = params?.[0] as number;
      const eventWithoutPrice = mockEvents.find(e => e.old_id === oldId);

      if (eventWithoutPrice) {
        const event = { ...eventWithoutPrice, price: storedEventPrices.filter(p => p["event"] === eventWithoutPrice.id).map(p => p.id) };
        return Promise.resolve({ rows: [event] });
      }
      return Promise.resolve({ rows: [] });
    }


    // Handle single event fetch by ID
    if (query.includes("WHERE id = $1")) {
      const id: number = params?.[0] as number;
      if (id === 500) {
        return Promise.resolve({ rows: [mockInvalidEvent] });
      }
      if (id > 0 && id <= mockEvents.length) {
        const eventWithoutPrice = { ...mockEvents[Number(id) - 1]};
        const event = { ...eventWithoutPrice, price: storedEventPrices.filter(p => p["event"] === id).map(p => p.id) };
        return Promise.resolve({ rows: [event] });
      }

      return Promise.resolve({ rows: [] });
    }

    // Handle fetching all events (no WHERE clause)
    const allEventsWithPrices = mockEvents.map(event => ({
      ...event,
      price: storedEventPrices.filter(p => p["event"] === event.id).map(p => p.id),
    }));
    return Promise.resolve({ rows: allEventsWithPrices });
  });
});

afterAll(async () => {
  await server.close();
});

describe("Event Fetch Routes", () => {
  describe("single event", () => {
    test("GET /api/v1/event/:id", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/event/1",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        ...baseMockEvent,
        price: storedEventPrices.filter(p => p["event"] === mockEvents[0]!.id).map(p => p.id),
        starts_at: baseMockEvent.starts_at.toISOString(),
        ends_at: baseMockEvent.ends_at?.toISOString(),
        doors_at: baseMockEvent.doors_at?.toISOString(),
      });
    });

    test("returns 404 when single event is not found", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/event/404",
      });

      expect(response.statusCode).toBe(404);
      //expect(response.json()).toEqual({ error: "Not Found" });
    });

    test("returns 400 when ID is invalid", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/event/invalid",
      });

      expect(response.statusCode).toBe(400);
    });

    test("returns 500 when database row is invalid", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/event/500",
      });

      expect(response.statusCode).toBe(500);
      //expect(response.json()).toEqual({ error: "Internal server error" });
    });
  });

  describe("multiple events", () => {
    test("GET /api/v1/event", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/event",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveLength(3);
      expect(response.json()).toEqual([
        {
          ...mockEvents[0],
          price: storedEventPrices.filter(p => p["event"] === mockEvents[0]!.id).map(p => p.id),
          starts_at: mockEvents[0]!.starts_at.toISOString(),
          ends_at: mockEvents[0]!.ends_at?.toISOString(),
          doors_at: mockEvents[0]!.doors_at?.toISOString(),
        },
        {
          ...mockEvents[1],
          price: storedEventPrices.filter(p => p["event"] === mockEvents[1]!.id).map(p => p.id),
          starts_at: mockEvents[1]!.starts_at.toISOString(),
          ends_at: mockEvents[1]!.ends_at?.toISOString(),
          doors_at: mockEvents[1]!.doors_at?.toISOString(),
        },
        {
          ...mockEvents[2],
          price: storedEventPrices.filter(p => p["event"] === mockEvents[2]!.id).map(p => p.id),
          starts_at: mockEvents[2]!.starts_at.toISOString(),
          ends_at: mockEvents[2]!.ends_at?.toISOString(),
          doors_at: mockEvents[2]!.doors_at?.toISOString(),
        },
      ]);
    });

    test("GET /api/v1/event with old_id filter", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/event?old_id=12346",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([{
        ...mockEvents[1],
        price: storedEventPrices.filter(p => p["event"] === mockEvents[1]!.id).map(p => p.id),
        starts_at: mockEvents[1]!.starts_at.toISOString(),
        ends_at: mockEvents[1]!.ends_at?.toISOString(),
        doors_at: mockEvents[1]!.doors_at?.toISOString(),
      }]);
    });

    test("GET /api/v1/event?production=… -> filters by single production id", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/event?production=10",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([{
        ...mockEvents[0],
        price: storedEventPrices.filter((p) => p["event"] === mockEvents[0]!.id).map((p) => p.id),
        starts_at: mockEvents[0]!.starts_at.toISOString(),
        ends_at: mockEvents[0]!.ends_at?.toISOString(),
        doors_at: mockEvents[0]!.doors_at?.toISOString(),
      }]);
    });

    test("GET /api/v1/event?production=… -> filters by multiple production ids", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/event?production=10,11",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([
        {
          ...mockEvents[0],
          price: storedEventPrices.filter((p) => p["event"] === mockEvents[0]!.id).map((p) => p.id),
          starts_at: mockEvents[0]!.starts_at.toISOString(),
          ends_at: mockEvents[0]!.ends_at?.toISOString(),
          doors_at: mockEvents[0]!.doors_at?.toISOString(),
        },
        {
          ...mockEvents[1],
          price: storedEventPrices.filter((p) => p["event"] === mockEvents[1]!.id).map((p) => p.id),
          starts_at: mockEvents[1]!.starts_at.toISOString(),
          ends_at: mockEvents[1]!.ends_at?.toISOString(),
          doors_at: mockEvents[1]!.doors_at?.toISOString(),
        },
      ]);
    });

    test("GET /api/v1/event?production=… -> 400 when no valid production ids after parse", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/event?production=abc",
      });

      expect(response.statusCode).toBe(400);
    });

    test("GET /api/v1/event?production= -> treats empty value as no production filter", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/event?production=",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveLength(3);
    });

    test("GET /api/v1/event?production=…&production=… -> accepts repeated keys as comma list", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/event?production=10&production=11",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveLength(2);
    });

    test("returns empty array when no events are found", async () => {
      const originalQuery = server.pg.query;
      server.pg.query = vi.fn().mockResolvedValue({ rows: [] });

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/event",
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([]);

      server.pg.query = originalQuery;
    });

    test("returns 500 when database row is invalid", async () => {
      const originalQuery = server.pg.query;
      server.pg.query = vi.fn().mockResolvedValue({ rows: [mockInvalidEvent] });

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/event",
      });
      expect(response.statusCode).toBe(500);

      server.pg.query = originalQuery;
    });
  });

  describe("with meta", () => {
    test("GET /api/v1/event/:id/meta", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/event/1/meta",
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        ...baseMockEvent,
        created_at: metaData.created_at.toISOString(),
        updated_at: metaData.updated_at.toISOString(),
        created_by: metaData.created_by,
        updated_by: metaData.updated_by,
        price: storedEventPrices.filter(p => p["event"] === mockEvents[0]!.id).map(p => p.id),
        starts_at: baseMockEvent.starts_at.toISOString(),
        ends_at: baseMockEvent.ends_at?.toISOString(),
        doors_at: baseMockEvent.doors_at?.toISOString(),
      });
    });

    test("returns 404 when meta event is not found", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/event/404/meta",
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(404);
      //expect(response.json()).toEqual({ error: "Not Found" });
    });

    test("returns 401 when not authenticated", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/event/1/meta",
      });

      expect(response.statusCode).toBe(401);
    });

    test("returns 400 when meta ID is invalid", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/event/invalid/meta",
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
