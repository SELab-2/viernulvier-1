import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";

import tagRoutes from "@/routes/tag/tags.js";
import { TagSchema, type Tag } from "@viernulvier/shared/index.js";

let server: FastifyInstance;

const createdTag: Tag = {
  id: 1,
  name: { nl: "Tag" },
  type: {
    id: 2,
    name: { nl: "Genre" },
    visible: true,
  },
  productions: [],
};

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

describe("Create on tag route", () => {

  test("POST /api/v1/tag -> creates a tag and returns it", async () => {

    server.pg.query = vi.fn().mockImplementation((query: string) => {

      const upper = query.trim().toUpperCase();

      if (upper.startsWith("INSERT")) {
        return Promise.resolve({ rows: [{ id: createdTag.id }], rowCount: 1 });
      }

      if (upper.startsWith("SELECT")) {
        return Promise.resolve({ rows: [createdTag], rowCount: 1 });
      }

      throw new Error(`Unexpected query: ${query}`);
    });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/tag",
      payload: {
        name: createdTag.name,
        type: createdTag.type.id,
      },
    });

    expect(response.statusCode).toBe(200);

    const parsed = TagSchema.parse(response.json());
    expect(parsed).toEqual(createdTag);
  });

  test("POST /api/v1/tag -> returns 404 when insert fails", async () => {

    server.pg.query = vi.fn().mockResolvedValue({
      rows: [],
      rowCount: 0,
    });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/tag",
      payload: {
        name: createdTag.name,
        type: createdTag.type.id,
      },
    });

    expect(response.statusCode).toBe(404);
  });

  test("POST /api/v1/tag -> rejects invalid body", async () => {

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/tag",
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

});