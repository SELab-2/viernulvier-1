import { describe, test, expect, beforeAll, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";

let server: FastifyInstance;

const mockProductions = [
  { id: "mock" },
  { id: "mock-2" },
];

beforeAll(async () => {
  server = await buildServer();

  server.pg.query = vi.fn().mockImplementation((_query: string, params?: unknown[]) => {
    if (params?.includes("mock")) {
      return Promise.resolve({ rows: [mockProductions[0]] });
    }
    return Promise.resolve({ rows: mockProductions });
  });
});

describe("Production Route", () => {
  test("GET /api/production", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/production",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(mockProductions);
  });

  test("GET /api/production/:id", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/production/mock",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ id: "mock" });
  });
});