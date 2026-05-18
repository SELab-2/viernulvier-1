import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { FastifyInstance } from "fastify";

import { buildServer } from "@/server.js";
import type { EventPrice } from "@viernulvier/shared/index.js";

vi.mock("@/plugins/authorize.js", () => import("@mocks/plugins/authorize.js"));

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

const metaData = {
  created_at: new Date("2025-12-31T09:00:00.000Z"),
  updated_at: new Date("2026-01-01T09:00:00.000Z"),
  created_by: 7,
  updated_by: 8,
};

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 1, username: "Admin1" });

  server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
    if (query.includes("created_at") && query.includes("updated_at") && query.includes("WHERE id = $1")) {
      const id = Number(params?.[0]);
      const price = storedEventPrices.find((p) => p.id === id);
      if (!price) return Promise.resolve({ rows: [] });

      return Promise.resolve({ rows: [{ ...price, ...metaData }] });
    }

    if (query.includes("FROM event_price WHERE id = $1")) {
      const id = Number(params?.[0]);
      const price = storedEventPrices.find((p) => p.id === id);
      return Promise.resolve({ rows: price ? [price] : [] });
    }

    if (query.includes("FROM event_price")) {
      return Promise.resolve({ rows: storedEventPrices });
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

describe("Event Price Fetch Routes", () => {
  describe("fetchEventPrice", () => {
    test("fetches a single event price by ID", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/event/price/1",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        ...baseEventPrice,
      });
    });

    test("returns 404 when event price not found", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/event/price/999",
      });

      expect(response.statusCode).toBe(404);
      //expect(response.json()).toEqual({ error: "Not Found" });
    });

    test("returns 400 when ID is invalid", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/event/price/invalid",
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("fetchEventPriceWithMeta", () => {
    test("fetches a single event price with metadata", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/event/price/1/meta",
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        id: 1,
        event: 10,
        amount: 25.50,
        created_at: expect.any(String),
        updated_at: expect.any(String),
        created_by: 7,
        updated_by: 8,
      });
    });

    test("returns 404 when event price not found", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/event/price/999/meta",
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(404);
      //expect(response.json()).toEqual({ error: "Not Found" });
    });

    test("returns 401 when not authenticated", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/event/price/1/meta",
      });

      expect(response.statusCode).toBe(401);
    });

    test("returns 400 when ID is invalid", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/event/price/invalid/meta",
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("fetchEventPrices", () => {
    test("fetches all event prices", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/event/price",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveLength(4);
      expect(response.json()).toContainEqual({
        id: 1,
        event: 10,
        amount: 25.50,
      });
    });

    test("returns empty array when no event prices exist", async () => {
      storedEventPrices = [];

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/event/price",
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([]);
    });
  });
});
