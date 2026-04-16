import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";

let server: FastifyInstance;
let sessionCookie: string;

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 1, username: "Admin1" });
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("Link tag to production", () => {
  test("POST /api/v1/production/:id/tags inserts link and returns linked: true", async () => {
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [{ production: 3, tag: 9 }],
      rowCount: 1,
    });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/production/3/tags",
      cookies: { session: sessionCookie },
      payload: { tag: 9 },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ linked: true });
  });

  test("POST /api/v1/production/:id/tags returns linked: false on duplicate", async () => {
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [],
      rowCount: 0,
    });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/production/3/tags",
      cookies: { session: sessionCookie },
      payload: { tag: 9 },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ linked: false });
  });
});
