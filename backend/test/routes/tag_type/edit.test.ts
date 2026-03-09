import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";

import tagTypeRoutes from "@/routes/tag_type/tag_types.js";
import { TagTypeSchema, type TagType } from "@viernulvier/shared/index.js";

let server: FastifyInstance;

const updatedTagType: TagType = {
  id: 1,
  name: { nl: "Updated Genre" },
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

describe("Edit tag type route", () => {

  test("PATCH /api/v1/tag-type/:id -> updates tag type", async () => {

    server.pg.query = vi.fn().mockImplementation((query: string) => {

      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({
          rows: [{ id: updatedTagType.id }],
          rowCount: 1,
        });
      }

      if (upper.startsWith("SELECT")) {
        return Promise.resolve({
          rows: [updatedTagType],
          rowCount: 1,
        });
      }

      throw new Error(`Unexpected query in edit tests: ${query}`);
    });

    const response = await server.inject({
      method: "PATCH",
      url: "/api/v1/tag-type/1",
      payload: {
        name: updatedTagType.name,
        visible: updatedTagType.visible,
      },
    });

    expect(response.statusCode).toBe(200);

    const parsed = TagTypeSchema.parse(response.json());
    expect(parsed).toEqual(updatedTagType);
  });

  test("PATCH /api/v1/tag-type/:id -> returns 404 when tag type does not exist", async () => {

    server.pg.query = vi.fn().mockResolvedValue({
      rows: [],
      rowCount: 0,
    });

    const response = await server.inject({
      method: "PATCH",
      url: "/api/v1/tag-type/999",
      payload: {
        name: { nl: "Does not exist" },
      },
    });

    expect(response.statusCode).toBe(404);
  });

});