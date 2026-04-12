import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { FastifyInstance } from "fastify";

import { buildServer } from "@/server.js";


let server: FastifyInstance;
let queryMock: ReturnType<typeof vi.fn>;
let storedEvents: Array<Record<string, unknown>>;
let idCounter = 1;
let shouldRejectQuery = false;
let sessionCookie: string;

const basePayload = {
  starts_at: "2026-01-01T18:00:00.000Z",
  ends_at: "2026-01-01T20:00:00.000Z",
  production: 10,
  hall: 3,
  doors_at: "2026-01-01T17:30:00.000Z",
  info: { nl: "Info mock create" },
  old_id: 12345,
};

function buildPayload() {
  return basePayload;
}

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 1, username: "TestAdmin" });

  queryMock = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
    if (shouldRejectQuery) {
      return Promise.reject(new Error("Database error"));
    }

    if (query.includes("INSERT INTO event")) {
      const createdEvent = {
        id: idCounter++,
        old_id: params?.[0] as number,
        starts_at: params?.[1] as Date,
        ends_at: params?.[2] as Date,
        production: params?.[3] as number,
        hall: params?.[4] as number,
        doors_at: params?.[5] as Date,
        info: params?.[6],
      };

      storedEvents.push(createdEvent);
      const event = { ...createdEvent, price: [] };
      return Promise.resolve({ rows: [event] });
    }

    if (query.includes("FROM event WHERE id = $1")) {
      const id = Number(params?.[0]);
      const event = storedEvents.find((row) => Number(row["id"]) === id);
      return Promise.resolve({ rows: event ? [{ ...event, price: [] }] : [] });
    }

    if (query.includes("FROM event") && !query.includes("WHERE id = $1")) {
      const events = storedEvents.map((row) => ({ ...row, price: [] }));
      return Promise.resolve({ rows: events });
    }

    return Promise.resolve({ rows: [] });
  });
  server.pg.query = queryMock as unknown as typeof server.pg.query;
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.clearAllMocks();
  shouldRejectQuery = false;
  storedEvents = [];
});

afterEach(() => {
  shouldRejectQuery = false;
});

describe("Event Create Routes", () => {
  describe("error handling", () => {
    test("returns 500 when database query fails", async () => {
      shouldRejectQuery = true;

      const response = await server.inject({
        method: "POST",
        url: "/api/v1/event",
        payload: buildPayload(),
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(500);
    });

    test("returns 400 when request payload is invalid", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/event",
        payload: {
          id: 1,
        },
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: "Invalid request data" });
      expect(queryMock).not.toHaveBeenCalled();
    });

    test("returns 404 when created row is not returned", async () => {
      const originalMock = server.pg.query;
      server.pg.query = vi.fn().mockResolvedValue({ rows: [] }) as unknown as typeof server.pg.query;
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/event",
        payload: buildPayload(),
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: "Not Found" });
      server.pg.query = originalMock;
    });

    test("requires authentication", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/event",
        payload: buildPayload(),
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("create event", () => {
    test("creates event from JSON payload with ISO date strings", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/event",
        payload: buildPayload(),
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        id: 1,
        ...basePayload,
        price: [],
      });
      expect(queryMock).toHaveBeenCalledOnce();
      const params = queryMock.mock.calls[0]?.[1] as unknown[];
      expect(params[1]).toBeInstanceOf(Date);
      expect(params[2]).toBeInstanceOf(Date);
      expect(params[5]).toBeInstanceOf(Date);
    });

    test("creates event with optional date fields as undefined", async () => {
      const payload = {
        ...buildPayload(),
        ends_at: undefined,
        doors_at: undefined,
        info: undefined,
      };
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/event",
        payload,
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        id: 2,
        ...basePayload,
        ends_at: undefined,
        doors_at: undefined,
        info: undefined,
        price: [],
      });
      expect(queryMock).toHaveBeenCalledOnce();
    });
  });
});
