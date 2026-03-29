import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { FastifyInstance } from "fastify";

import { buildServer } from "@/server.js";

let server: FastifyInstance;
let storedEvents: Array<{ id: number; [key: string]: unknown }>;
let sessionCookie: string;

const baseEvent = {
  id: 1,
  old_id: 111,
  starts_at: new Date("2026-01-01T18:00:00.000Z"),
  ends_at: new Date("2026-01-01T20:00:00.000Z"),
  production: 10,
  hall: 3,
  doors_at: new Date("2026-01-01T17:30:00.000Z"),
  info: { nl: "Info mock 1" },
};

const initialEvents = [
  baseEvent,
  { ...baseEvent, id: 2, production: 11, hall: 4, info: { nl: "Info mock 2" } },
  { ...baseEvent, id: 3, production: 12, hall: 5, info: { nl: "Info mock 3" } },
];

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 1, username: "Admin1" });

  server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
    if (query.includes("UPDATE event")) {
      const id = Number(params?.[9]);
      const index = storedEvents.findIndex((event) => Number(event.id) === id);
      if (index === -1) return Promise.resolve({ rows: [] });

      // eslint-disable-next-line security/detect-object-injection
      const current = storedEvents[index]!;
      const updated = {
        ...current,
        old_id: (params?.[0] as number | undefined) ?? current["old_id"],
        starts_at: (params?.[1] as Date | undefined) ?? current["starts_at"],
        ends_at: (params?.[2] as Date | undefined) ?? current["ends_at"],
        production: (params?.[3] as number | undefined) ?? current["production"],
        hall: (params?.[4] as number | undefined) ?? current["hall"],
        doors_at: (params?.[5] as Date | undefined) ?? current["doors_at"],
        info: params?.[6] ?? current["info"],
      };

      // eslint-disable-next-line security/detect-object-injection
      storedEvents[index] = updated;
      const event = {...updated, price: []};
      return Promise.resolve({ rows: [event] });
    }

    if (query.includes("FROM event WHERE id = $1")) {
      const id = Number(params?.[0]);
      if (id > storedEvents.length) return Promise.resolve({ rows: [] });
      const event = { ...storedEvents.find((row) => Number(row.id) === id), price: [] };
      return Promise.resolve({ rows: event ? [event] : [] });
    }

    if (query.includes("FROM event") && !query.includes("WHERE id = $1")) {
      const events = storedEvents.map((row) => ({ ...row, price: [] }));
      return Promise.resolve({ rows: events });
    }

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

describe("Event Bulk Edit Routes", () => {

  describe("bulk partial updates", () => {
    test("updates single field on multiple events", async () => {
      const editResponse = await server.inject({
        method: "PATCH",
        url: "/api/v1/event",
        cookies: { session: sessionCookie },
        payload: { ids: [1, 3], production: 99 },
      });

      expect(editResponse.statusCode).toBe(200);
      expect(editResponse.json()).toEqual([
        {
          ...initialEvents[0],
          production: 99,
          price: [],
          starts_at: initialEvents[0]!.starts_at.toISOString(),
          ends_at: initialEvents[0]!.ends_at.toISOString(),
          doors_at: initialEvents[0]!.doors_at.toISOString(),
        },
        {
          ...initialEvents[2],
          production: 99,
          price: [],
          starts_at: initialEvents[2]!.starts_at.toISOString(),
          ends_at: initialEvents[2]!.ends_at.toISOString(),
          doors_at: initialEvents[2]!.doors_at.toISOString(),
        },
      ]);

      const listResponse = await server.inject({
        method: "GET",
        url: "/api/v1/event",
        cookies: { session: sessionCookie },
      });

      expect(listResponse.statusCode).toBe(200);
      expect(listResponse.json()).toHaveLength(3);
      expect(listResponse.json()[0]).toEqual({
        ...initialEvents[0],
        production: 99,
        price: [],
        starts_at: initialEvents[0]!.starts_at.toISOString(),
        ends_at: initialEvents[0]!.ends_at.toISOString(),
        doors_at: initialEvents[0]!.doors_at.toISOString(),
      });
      expect(listResponse.json()[2]).toEqual({
        ...initialEvents[2],
        production: 99,
        price: [],
        starts_at: initialEvents[2]!.starts_at.toISOString(),
        ends_at: initialEvents[2]!.ends_at.toISOString(),
        doors_at: initialEvents[2]!.doors_at.toISOString(),
      });
    });

    test("updates multiple fields on multiple events", async () => {
      const newStartsAt = new Date("2026-02-01T18:00:00.000Z");
      const newEndsAt = new Date("2026-02-01T21:00:00.000Z");

      const editResponse = await server.inject({
        method: "PATCH",
        url: "/api/v1/event",
        cookies: { session: sessionCookie },
        payload: {
          ids: [2, 3],
          starts_at: newStartsAt,
          ends_at: newEndsAt,
          hall: 9,
        },
      });

      expect(editResponse.statusCode).toBe(200);
      expect(editResponse.json()).toEqual([
        {
          ...initialEvents[1],
          starts_at: newStartsAt.toISOString(),
          ends_at: newEndsAt.toISOString(),
          hall: 9,
          doors_at: initialEvents[1]!.doors_at.toISOString(),
          price: [],
        },
        {
          ...initialEvents[2],
          starts_at: newStartsAt.toISOString(),
          ends_at: newEndsAt.toISOString(),
          hall: 9,
          doors_at: initialEvents[2]!.doors_at.toISOString(),
          price: [],
        },
      ]);

      const listResponse = await server.inject({
        method: "GET",
        url: "/api/v1/event",
        cookies: { session: sessionCookie },
      });

      expect(listResponse.statusCode).toBe(200);
      expect(listResponse.json()).toHaveLength(3);
      expect(listResponse.json()[1]).toEqual({
        ...initialEvents[1],
        starts_at: newStartsAt.toISOString(),
        ends_at: newEndsAt.toISOString(),
        hall: 9,
        doors_at: initialEvents[1]!.doors_at.toISOString(),
        price: [],
      });
      expect(listResponse.json()[2]).toEqual({
        ...initialEvents[2],
        starts_at: newStartsAt.toISOString(),
        ends_at: newEndsAt.toISOString(),
        hall: 9,
        doors_at: initialEvents[2]!.doors_at.toISOString(),
        price: [],
      });
    });

    test("bulk edits some events and keeps the others unchanged", async () => {
      const editResponse = await server.inject({
        method: "PATCH",
        url: "/api/v1/event",
        cookies: { session: sessionCookie },
        payload: { ids: [1, 2], production: 555 },
      });

      expect(editResponse.statusCode).toBe(200);
      expect(editResponse.json()).toEqual([
        {
          ...initialEvents[0],
          production: 555,
          starts_at: initialEvents[0]!.starts_at.toISOString(),
          ends_at: initialEvents[0]!.ends_at.toISOString(),
          doors_at: initialEvents[0]!.doors_at.toISOString(),
          price: [],
        },
        {
          ...initialEvents[1],
          production: 555,
          starts_at: initialEvents[1]!.starts_at.toISOString(),
          ends_at: initialEvents[1]!.ends_at.toISOString(),
          doors_at: initialEvents[1]!.doors_at.toISOString(),
          price: [],
        },
      ]);

      const listResponse = await server.inject({
        method: "GET",
        url: "/api/v1/event",
        cookies: { session: sessionCookie },
      });

      expect(listResponse.statusCode).toBe(200);
      expect(listResponse.json()).toHaveLength(3);
      expect(listResponse.json()).toEqual([
        {
          ...initialEvents[0],
          production: 555,
          starts_at: initialEvents[0]!.starts_at.toISOString(),
          ends_at: initialEvents[0]!.ends_at.toISOString(),
          doors_at: initialEvents[0]!.doors_at.toISOString(),
          price: [],
        },
        {
          ...initialEvents[1],
          production: 555,
          starts_at: initialEvents[1]!.starts_at.toISOString(),
          ends_at: initialEvents[1]!.ends_at.toISOString(),
          doors_at: initialEvents[1]!.doors_at.toISOString(),
          price: [],
        },
        {
          ...initialEvents[2],
          starts_at: initialEvents[2]!.starts_at.toISOString(),
          ends_at: initialEvents[2]!.ends_at.toISOString(),
          doors_at: initialEvents[2]!.doors_at.toISOString(),
          price: [],
        },
      ]);
    });
  });

  describe("error handling", () => {
    test("returns 500 when database query fails", async () => {
      const originalMock = server.pg.query;
      server.pg.query = vi.fn().mockRejectedValue(new Error("Database error"));

      const response = await server.inject({
        method: "PATCH",
        url: "/api/v1/event",
        cookies: { session: sessionCookie },
        payload: { ids: [1, 2], production: 20 },
      });

      expect(response.statusCode).toBe(500);
      server.pg.query = originalMock;
    });

    test("requires authentication", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: "/api/v1/event",
        payload: { ids: [1, 2], production: 20 },
      });

      expect(response.statusCode).toBe(401);
    });

    test("returns 400 when request payload is invalid", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: "/api/v1/event",
        cookies: { session: sessionCookie },
        payload: {
          ids: [1, 2],
          production: "not a number",
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: "Invalid request data" });
    });

    test("returns 404 when any event not in database", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: "/api/v1/event",
        cookies: { session: sessionCookie },
        payload: { ids: [1, 999], production: 20 },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: "Not Found" });
    });

    test("returns 404 when no rows are returned", async () => {
      const originalMock = server.pg.query;
      server.pg.query = vi.fn().mockResolvedValue({ rows: [] });

      const response = await server.inject({
        method: "PATCH",
        url: "/api/v1/event",
        cookies: { session: sessionCookie },
        payload: { ids: [1, 2], production: 20 },
      });

      expect(response.statusCode).toBe(404);
      server.pg.query = originalMock;
    });
  });
});
