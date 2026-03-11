import { describe, test, expect, beforeAll, afterAll, vi } from "vitest";
import { buildServer } from "@/server.js";
import { TagTypeSchema, type TagType } from "@viernulvier/shared/index.js";
import type { FastifyInstance } from "fastify";

let server: FastifyInstance;
let sessionCookie: string;

const tagType: TagType = {
  id: 1,
  name: { en: "Genre", nl: "Genre" },
};

const tagTypeWithMeta = {
  ...tagType,
  created_at: new Date(),
  updated_at: new Date(),
  created_by: 1,
  updated_by: 1,
};

beforeAll(async () => {
  server = await buildServer();

  sessionCookie = server.jwt.sign({ id: 1, username: "Admin" });

  server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
    const id = Number(params?.[0]);
    const isMetaQuery = query.includes("created_at");

    // fetchTagType (single)
    if (query.includes("WHERE id")) {

      if (id === tagType.id) {
        return Promise.resolve({
          rows: [isMetaQuery ? tagTypeWithMeta : tagType],
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

describe("Fetch tag_type with metadata", () => {

  test("GET /api/v1/tags/type/:id/meta", async () => {

    const response = await server.inject({
      method: "GET",
      cookies: { session: sessionCookie },
      url: `/api/v1/tags/type/${tagTypeWithMeta.id}/meta`,
    });

    expect(response.statusCode).toBe(200);
    expect(TagTypeSchema.withMeta().parse(response.json())).toEqual(tagTypeWithMeta);
  });

  test("GET returns 404 when tag_type not found", async () => {

    const response = await server.inject({
      method: "GET",
      cookies: { session: sessionCookie },
      url: `/api/v1/tags/type/999/meta`,
    });

    expect(response.statusCode).toBe(404);
  });

});