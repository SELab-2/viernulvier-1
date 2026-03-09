import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";

import tagTypeRoutes from "@/routes/tag_type/tag_types.js";
import { TagTypeSchema } from "@viernulvier/shared/index.js";

let server: FastifyInstance;

const tagType = {
  id: 1,
  name: { nl: "Genre" },
  visible: true,
};

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

describe("Create tag type route", () => {

  test("POST /api/v1/tag-type -> creates tag type", async () => {

    server.pg.query = vi.fn().mockImplementation((query: string) => {

      const upper = query.trim().toUpperCase();

      if (upper.startsWith("INSERT")) {
        return Promise.resolve({ rows: [{ id: tagType.id }], rowCount: 1 });
      }

      if (upper.startsWith("SELECT")) {
        return Promise.resolve({ rows: [tagType], rowCount: 1 });
      }

      throw new Error(`Unexpected query: ${query}`);
    });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/tag-type",
      payload: {
        name: tagType.name,
        visible: tagType.visible,
      },
    });

    expect(response.statusCode).toBe(200);

    const parsed = TagTypeSchema.parse(response.json());
    expect(parsed).toEqual(tagType);
  });

});