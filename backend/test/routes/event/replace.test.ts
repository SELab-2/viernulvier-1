import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { FastifyInstance } from "fastify";

import { buildServer } from "@/server.js";

let server: FastifyInstance;
let storedEvents: Array<{ id: number; [key: string]: unknown }>;
let sessionCookie: string;

const baseEvent = {
  id: 1,
  starts_at: new Date("2026-01-01T18:00:00.000Z"),
  ends_at: new Date("2026-01-01T20:00:00.000Z"),
  production: 10,
  hall: 3,
  doors_at: new Date("2026-01-01T17:30:00.000Z"),
  vendor_id: 42,
  info: { nl: "Info mock 1" },
  created_by: 1,
  created_at: new Date("2026-01-01T10:00:00.000Z"),
  updated_by: null,
  updated_at: null,
  old_id: 12345,
};

const initialEvents = [
  baseEvent,
  { ...baseEvent, id: 2, production: 11, hall: 4, info: { nl: "Info mock 2" }, old_id: 12346 },
  { ...baseEvent, id: 3, production: 12, hall: 5, info: { nl: "Info mock 3" }, old_id: 12347 },
];

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 1, username: "TestAdmin" });

  server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
    if (query.includes("UPDATE events")) {
      const id = Number(params?.[9]);
      const index = storedEvents.findIndex((event) => Number(event.id) === id);
      if (index === -1) return Promise.resolve({ rows: [] });

      // eslint-disable-next-line security/detect-object-injection
      const current = storedEvents[index]!;
      const updated = {
        ...current,
        starts_at: (params?.[0] as Date | undefined) ?? current["starts_at"],
        ends_at: (params?.[1] as Date | undefined) ?? current["ends_at"],
        production: (params?.[2] as number | undefined) ?? current["production"],
        hall: (params?.[3] as number | undefined) ?? current["hall"],
        doors_at: (params?.[4] as Date | undefined) ?? current["doors_at"],
        vendor_id: (params?.[5] as number | undefined) ?? current["vendor_id"],
        info: params?.[6] ?? current["info"],
        old_id: params?.[7] ?? current["old_id"],
        updated_at: params?.[8] ? new Date(params?.[8] as string) : new Date(),
        updated_by: params?.[9],
      };

      // eslint-disable-next-line security/detect-object-injection
      storedEvents[index] = updated;
      const event = { ...updated, price: [] };
      return Promise.resolve({ rows: [event] });
    }

    if (query.includes("FROM events WHERE id = $1")) {
      const id = Number(params?.[0]);
      const foundEvent = storedEvents.find((row) => Number(row.id) === id);
      if (!foundEvent) return Promise.resolve({ rows: [] });
      const event = { ...foundEvent, price: [] };
      return Promise.resolve({ rows: [event] });
    }

    if (query.includes("FROM events")) {
      const events = storedEvents.map((row) => ({ ...row, price: [] }));
      return Promise.resolve({ rows: events });
    }

    console.error("Unhandled query:", query);
    return Promise.resolve({ rows: [] });
  });
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.clearAllMocks();
  storedEvents = structuredClone(initialEvents);
});

describe("Event Replace Routes", () => {
  describe("error handling", () => {
    const replacement = {
      starts_at: new Date("2026-03-01T18:00:00.000Z"),
      ends_at: new Date("2026-03-01T21:00:00.000Z"),
      production: 19,
      hall: 8,
      doors_at: new Date("2026-03-01T17:00:00.000Z"),
      vendor_id: 190,
      info: { nl: "Info inserted" },
      old_id: 12354,
    };
    test("returns 500 when database query fails", async () => {
      const originalMock = server.pg.query;
      server.pg.query = vi.fn().mockRejectedValue(new Error("Database error"));

      const response = await server.inject({
        method: "PUT",
        url: "/api/v1/event/1",
        payload: { ...baseEvent, production: 20 },
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(500);
      server.pg.query = originalMock;
    });

    test("returns 400 when request payload is invalid", async () => {
      const response = await server.inject({
        method: "PUT",
        url: "/api/v1/event/1",
        payload: {
          id: 1,
          production: 20,
          old_id: 12345,
        },
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: "Invalid request data" });
    });

    test("returns 404 when event does not exist", async () => {
      const replaceResponse = await server.inject({
        method: "PUT",
        url: "/api/v1/event/999",
        payload: replacement,
        cookies: { session: sessionCookie },
      });

      expect(replaceResponse.statusCode).toBe(404);
      expect(replaceResponse.json()).toEqual({ error: "Not Found" });
    });

    test("returns 400 when ID is invalid", async () => {

      const replaceResponse = await server.inject({
        method: "PUT",
        url: "/api/v1/event/invalid",
        payload: replacement,
        cookies: { session: sessionCookie },
      });

      expect(replaceResponse.statusCode).toBe(400);
    });

    test("requires authentication", async () => {

      const replaceResponse = await server.inject({
        method: "PUT",
        url: "/api/v1/event/1",
        payload: replacement,
      });

      expect(replaceResponse.statusCode).toBe(401);
    });
  });

  describe("replacing events", () => {
    const replacement = {
      starts_at: new Date("2026-03-01T18:00:00.000Z"),
      ends_at: new Date("2026-03-01T21:00:00.000Z"),
      production: 19,
      hall: 8,
      doors_at: new Date("2026-03-01T17:00:00.000Z"),
      vendor_id: 190,
      info: { nl: "Info replaced" },
      old_id: 12354,
    };

    
    test("replaces one event", async () => {
      const replaceResponse = await server.inject({
        method: "PUT",
        url: "/api/v1/event/1",
        payload: replacement,
        cookies: { session: sessionCookie },
      });

      expect(replaceResponse.statusCode).toBe(200);
      expect(replaceResponse.json()).toEqual({
        ...replacement,
        id: 1,
        price: [],
        starts_at: replacement.starts_at.toISOString(),
        ends_at: replacement.ends_at.toISOString(),
        doors_at: replacement.doors_at.toISOString(),
      });
    });

    test("control if others are unchanged", async () => {
      await server.inject({
        method: "PUT",
        url: "/api/v1/event/1",
        payload: replacement,
        cookies: { session: sessionCookie },
      });
      const listResponse = await server.inject({
        method: "GET",
        url: "/api/v1/event",
        cookies: { session: sessionCookie },
      });

      expect(listResponse.statusCode).toBe(200);
      const events = listResponse.json();
      expect(events).toHaveLength(3);
      
      // Check first event (the replaced one) has updated data and metadata
      expect(events[0]!.id).toBe(1);
      expect(events[0]!.starts_at).toBe(replacement.starts_at.toISOString());
      expect(events[0]!.ends_at).toBe(replacement.ends_at.toISOString());
      expect(events[0]!.doors_at).toBe(replacement.doors_at.toISOString());
      expect(events[0]!.production).toBe(replacement.production);
      expect(events[0]!.hall).toBe(replacement.hall);
      expect(events[0]!.vendor_id).toBe(replacement.vendor_id);
      expect(events[0]!.info).toEqual(replacement.info);
      
      // Check other events are unchanged
      expect(events[1]!.id).toBe(2);
      expect(events[2]!.id).toBe(3);
    });
    test("updates metadata on replace", async () => {
      // Verify metadata was updated via individual GET request
      await server.inject({
        method: "PUT",
        url: "/api/v1/event/1",
        payload: replacement,
        cookies: { session: sessionCookie },
      });
      const getResponse = await server.inject({
        method: "GET",
        url: "/api/v1/event/1/meta",
        cookies: { session: sessionCookie },
      });
      expect(getResponse.statusCode).toBe(200);
      const eventWithMeta = getResponse.json();
      expect(eventWithMeta.updated_by).toBe(1);
      expect(eventWithMeta.updated_at).toBeDefined();
    });
  });
});
