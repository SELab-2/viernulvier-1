import type { Production } from "@viernulvier/shared/types/production.js";
import { describe, test, expect, beforeAll, vi, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";

let server: FastifyInstance;

const mockProductions: Production[] = [
  { id: 1, title: "blah" },
  { id: 2, title: "blah" },
];

beforeAll(async () => {
  server = await buildServer();

  server.pg.query = vi
    .fn()
    .mockImplementation((_query: string, params?: string[]) => {
      const id = Number(params?.at(0));
      if (id) {
        return Promise.resolve({
          rows: [mockProductions.find((prod) => prod.id == id)],
        });
      }
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
    expect(response.json()).toEqual(mockProductions[0]);
  });
});
