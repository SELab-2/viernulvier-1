import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";

import tagTypeRoutes from "@/routes/tag_type/tag_types.js";

let server: FastifyInstance;

beforeAll(async () => {
  server = await buildServer();
  await server.register(tagTypeRoutes);
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("Delete tag type route", () => {

  test("DELETE /api/v1/tag-type/:id -> deletes tag type", async () => {

    server.pg.query = vi.fn().mockResolvedValue({
      rows: [{ id: 1 }],
      rowCount: 1,
    });

    const response = await server.inject({
      method: "DELETE",
      url: "/api/v1/tag-type/1",
    });

    expect(response.statusCode).toBe(200);
  });

  test("DELETE /api/v1/tag-type/:id -> returns 404 when tag type does not exist", async () => {

    server.pg.query = vi.fn().mockResolvedValue({
      rows: [],
      rowCount: 0,
    });

    const response = await server.inject({
      method: "DELETE",
      url: "/api/v1/tag-type/999",
    });

    expect(response.statusCode).toBe(404);
  });

});