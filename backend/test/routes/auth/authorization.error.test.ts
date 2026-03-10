import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";

let server: FastifyInstance;

beforeAll(async () => {
  server = await buildServer();
});

afterAll(async () => {
  await server.close();
});

describe("Authorization errors", () => {
  test("GET /api/v1/auth/:id — returns 401 without session cookie", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/auth/404",
    });

    expect(response.statusCode).toBe(401);
  });

  test("GET /api/v1/auth/:id — returns 401 with invalid session cookie", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/auth/404",
      cookies: { session: "invalid.token.here" },
    });

    expect(response.statusCode).toBe(401);
  });
});