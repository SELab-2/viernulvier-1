import { describe, test, expect, beforeAll } from "vitest";
import { buildServer } from "../src/server.js";
import type { FastifyInstance } from "fastify";

let server: FastifyInstance;

beforeAll(async () => {
  server = await buildServer();
});

describe("Root Route", () => {
  test("GET /api/production", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/production",
    });

    expect(response.statusCode).toBe(500);
  });
});