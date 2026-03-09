import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";

import tagRoutes from "@/routes/tag/tags.js";

let server: FastifyInstance;

beforeAll(async () => {
  server = await buildServer();
  await server.register(tagRoutes);
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("Delete tag route", () => {

  test("DELETE /api/v1/tag/:id -> deletes tag", async () => {

    server.pg.query = vi.fn().mockResolvedValue({
      rows: [{ id: 1 }],
      rowCount: 1,
    });

    const response = await server.inject({
      method: "DELETE",
      url: "/api/v1/tag/1",
    });

    expect(response.statusCode).toBe(200);
  });

});