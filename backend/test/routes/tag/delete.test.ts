import { describe, test, expect, beforeAll, vi, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { TagSchema, type Tag } from "@viernulvier/shared/index.js";

let server: FastifyInstance;

const mockTag: Tag = {
  id: 5,
  name: { en: "Music", nl: "Muziek" },
  type: 1,
  productions: [],
};

beforeAll(async () => {
  server = await buildServer();
});

afterAll(async () => {
  await server.close();
});

describe("Delete tag", () => {
  test("DELETE /api/v1/tags/:id", async () => {
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [mockTag],
      rowCount: 1,
    });

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/tags/${mockTag.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(TagSchema.parse(response.json())).toEqual(mockTag);
  });

  test("DELETE /api/v1/tag/:id returns 404", async () => {
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [],
      rowCount: 0,
    });

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/tags/${mockTag.id}`,
    });

    expect(response.statusCode).toBe(404);
  });
});