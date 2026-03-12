import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { FastifyInstance } from "fastify";

import { buildServer } from "@/server.js";
import type { EventPrice } from "@viernulvier/shared/index.js";

let server: FastifyInstance;
let storedEventPrices: EventPrice[];
let sessionCookie: string;

const baseEventPrice: EventPrice = {
  id: 1,
  event: 10,
  amount: 25.50,
};

const initialEventPrices: EventPrice[] = [
  baseEventPrice,
  { id: 2, event: 11, amount: 30.00 },
  { id: 3, event: 12, amount: 22.75 },
  { id: 4, event: 10, amount: 15.00 },
];

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 1, username: "Admin1" });

  server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
    if (query.includes("INSERT INTO event_price")) {
      const newId = Math.max(...storedEventPrices.map(p => p.id)) + 1;
      const newPrice: EventPrice = {
        id: newId,
        event: params?.[0] as number,
        amount: params?.[1] as number,
      };
      storedEventPrices.push(newPrice);
      return Promise.resolve({ rows: [newPrice] });
    }

    return Promise.resolve({ rows: [] });
  });
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.clearAllMocks();
  storedEventPrices = structuredClone(initialEventPrices);
});

describe("Event Price Create Route", () => {

  describe("success cases", () => {
    test("handles concurrent creations", async () => {
      const responses = await Promise.all([
        server.inject({
          method: "POST",
          url: "/event_price/api/v1",
          cookies: { session: sessionCookie },
          payload: { event: 30, amount: 50.00 },
        }),
        server.inject({
          method: "POST",
          url: "/event_price/api/v1",
          cookies: { session: sessionCookie },
          payload: { event: 31, amount: 55.00 },
        }),
      ]);

      expect(responses).toHaveLength(2);
      expect(responses.every((r) => r.statusCode === 200)).toBe(true);
      expect(storedEventPrices).toHaveLength(6); // 4 initial + 2 new
    });

    test("preserves existing prices when creating new ones", async () => {
      const initialCount = storedEventPrices.length;

      await server.inject({
        method: "POST",
        url: "/event_price/api/v1",
        cookies: { session: sessionCookie },
        payload: { event: 32, amount: 18.50 },
      });

      expect(storedEventPrices).toHaveLength(initialCount + 1);
      expect(storedEventPrices[0]).toEqual(initialEventPrices[0]);
    });
  });

  describe("error validation", () => {
    test("creates a new event price", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/event_price/api/v1",
        cookies: { session: sessionCookie },
        payload: {
            event: 15,
            amount: 35.99,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        id: expect.any(Number),
        event: 15,
        amount: 35.99,
      });
    });

    test("returns 400 when amount is invalid", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/event_price/api/v1",
        cookies: { session: sessionCookie },
        payload: {
            event: 15,
            amount: -5, // negative amount
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: "Invalid request data" });
    });

    test("returns 400 when required fields are missing", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/event_price/api/v1",
        cookies: { session: sessionCookie },
        payload: {
            // missing event and amount
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: "Invalid request data" });
    });

    test("requires authentication", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/event_price/api/v1",
        payload: {
            event: 15,
            amount: 35.99,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    test("returns 404 when insert returns no rows", async () => {
      server.pg.query = vi.fn().mockResolvedValue({ rows: [] });
      const response = await server.inject({
        method: "POST",
        url: "/event_price/api/v1",
        cookies: { session: sessionCookie },
        payload: {
            event: 15,
            amount: 35.99,
        },
      });
      expect(response.statusCode).toBe(404);
    });

  });
});
