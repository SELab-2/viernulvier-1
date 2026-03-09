import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";

import tagRoutes from "@/routes/tag/tags.js";
import { TagSchema } from "@viernulvier/shared/index.js";

let server: FastifyInstance;

const tag = {
  id: 1,
  name: { nl: "Updated" },
  type: { id: 1, name: { nl: "Genre" }, visible: true },
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

describe("Edit tag route", () => {

  test("PATCH /api/v1/tag/:id -> updates tag", async () => {

    server.pg.query = vi.fn().mockImplementation((query: string) => {

      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [{ id: tag.id }], rowCount: 1 });
      }

      if (upper.startsWith("SELECT")) {
        return Promise.resolve({ rows: [tag], rowCount: 1 });
      }

      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const response = await server.inject({
      method: "PATCH",
      url: "/api/v1/tag/1",
      payload: {
        name: tag.name,
      },
    });

    expect(response.statusCode).toBe(200);

    const parsed = TagSchema.parse(response.json());
    expect(parsed).toEqual(tag);
  });

});