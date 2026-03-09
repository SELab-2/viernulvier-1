import { describe, test, expect, beforeAll, vi, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";

let server: FastifyInstance;

const mockProductions = [{ id: 1 }, { id: 2 }];

beforeAll(async () => {
  server = await buildServer();

  server.pg.query = vi
    .fn()
    .mockImplementation((_query: string, params?: unknown[]) => {
      if (params && params.length >= 1) {
        return Promise.resolve({
          rows: mockProductions.filter(
            (obj) => obj.id == (params[0] as number),
          ),
        });
      }
      1;
      return Promise.resolve({ rows: mockProductions });
    });
});

afterAll(async () => {
  await server.close();
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
      url: "/api/production/1",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ id: 1 });
  });
});
