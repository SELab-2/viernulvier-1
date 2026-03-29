import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { FastifyInstance } from "fastify";

import { buildServer } from "@/server.js";

let server: FastifyInstance;
let storedEvents: Array<Record<string, unknown>>;
let sessionCookie: string;

const baseEvent = {
  id: 1,
  old_id: 111,
  starts_at: new Date("2026-01-01T18:00:00.000Z"),
  ends_at: new Date("2026-01-01T20:00:00.000Z"),
  production: 10,
  hall: 3,
  doors_at: new Date("2026-01-01T17:30:00.000Z"),
  vendor_id: 42,
  info: { nl: "Info mock 1" },
  price: [1],
};

const initialEvents = [
  baseEvent,
  { ...baseEvent, id: 2, old_id: 112, production: 11, hall: 4, info: { nl: "Info mock 2" }, price: [2] },
  { ...baseEvent, id: 3, old_id: 113, production: 12, hall: 5, info: { nl: "Info mock 3" }, price: [3] },
];

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 1, username: "TestAdmin" });

  server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
    if (query.includes("DELETE FROM events WHERE id = $1")) {
      const id = Number(params?.[0]);
      const index = storedEvents.findIndex((event) => Number(event["id"]) === id);
      if (index === -1) return Promise.resolve({ rows: [] });
      const deleted = storedEvents.splice(index, 1);
      return Promise.resolve({ rows: deleted });
    }

    if (query.includes("FROM events WHERE id = $1")) {
      const id = Number(params?.[0]);
      const event = storedEvents.find((row) => Number(row["id"]) === id);
      return Promise.resolve({ rows: event ? [event] : [] });
    }

    if (query.includes("FROM events")) {
      return Promise.resolve({ rows: storedEvents });
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

describe("Event Delete Routes", () => {
  describe("error handling", () => {
    test("returns 500 when database query fails", async () => {
      const originalMock = server.pg.query;
      server.pg.query = vi.fn().mockRejectedValue(new Error("Database error"));

      const response = await server.inject({
        method: "DELETE",
        url: "/api/v1/event/1",
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(500);
      server.pg.query = originalMock;
    });

    test("returns 404 when event not in database to begin with", async () => {
      const response = await server.inject({
        method: "DELETE",
        url: "/api/v1/event/999",
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: "Not Found" });
    });

    test("returns 400 when ID is invalid", async () => {
      const response = await server.inject({
        method: "DELETE",
        url: "/api/v1/event/invalid",
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(400);
    });

    test("requires authentication", async () => {
      const response = await server.inject({
        method: "DELETE",
        url: "/api/v1/event/1",
      });

      expect(response.statusCode).toBe(401);
    });
  });


  test("deletes one event and keeps the others", async () => {
    const deleteResponse = await server.inject({
      method: "DELETE",
      url: "/api/v1/event/2",
      cookies: { session: sessionCookie },
    });

    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteResponse.json()).toEqual({
      ...initialEvents[1],
      starts_at: initialEvents[1]!.starts_at.toISOString(),
      ends_at: initialEvents[1]!.ends_at.toISOString(),
      doors_at: initialEvents[1]!.doors_at.toISOString(),
    });

    const listResponse = await server.inject({
      method: "GET",
      url: "/api/v1/event",
      cookies: { session: sessionCookie },
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toHaveLength(2);
    expect(listResponse.json()).toEqual([
      {
        ...initialEvents[0],
        starts_at: initialEvents[0]!.starts_at.toISOString(),
        ends_at: initialEvents[0]!.ends_at.toISOString(),
        doors_at: initialEvents[0]!.doors_at.toISOString(),
      },
      {
        ...initialEvents[2],
        starts_at: initialEvents[2]!.starts_at.toISOString(),
        ends_at: initialEvents[2]!.ends_at.toISOString(),
        doors_at: initialEvents[2]!.doors_at.toISOString(),
      },
    ]);
  });
});
