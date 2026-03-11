import { describe, test, expect, beforeAll, afterAll, vi } from "vitest";
import { buildServer } from "@/server.js";
import { TagTypeSchema, type TagType } from "@viernulvier/shared/index.js";
import type { FastifyInstance } from "fastify";

let server: FastifyInstance;

const tagType: TagType = {
  id: 1,
  name: { en: "Genre", nl: "Genre" },
  visible: true,
};

beforeAll(async () => {
  server = await buildServer();

  server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {

    // fetchTagType (single)
    if (query.includes("WHERE id")) {
      const id = Number(params?.[0]);

      if (id === tagType.id) {
        return Promise.resolve({
          rows: [tagType],
          rowCount: 1,
        });
      }

      return Promise.resolve({ rows: [], rowCount: 0 });
    }

    // fetchTagTypes (all)
    if (query.includes("FROM tag_type")) {
      return Promise.resolve({
        rows: [tagType],
        rowCount: 1,
      });
    }

    return Promise.resolve({ rows: [], rowCount: 0 });
  });
});

afterAll(async () => {
  await server.close();
});

describe("Fetch tag_type", () => {

  test("GET /api/v1/tags/type/:id", async () => {

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/tags/type/${tagType.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(TagTypeSchema.parse(response.json())).toEqual(tagType);
  });

  test("GET returns 404", async () => {

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/tag/type/999`,
    });

    expect(response.statusCode).toBe(404);
  });

});

test("GET /api/v1/tags/type", async () => {

  const response = await server.inject({
    method: "GET",
    url: `/api/v1/tags/type`,
  });

  expect(response.statusCode).toBe(200);
  expect(TagTypeSchema.array().parse(response.json())).toEqual([tagType]);
});