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

beforeAll(async () => {
  server = await buildServer();

  sessionCookie = server.jwt.sign({ id: 1, username: "Admin" });

  server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {

    if (query.includes("DELETE")) {
      const id = Number(params?.[0]);

      if (id === tagType.id) {
        return Promise.resolve({
          rows: [tagType],
          rowCount: 1,
        });
      }

      return Promise.resolve({ rows: [], rowCount: 0 });
    }

    return Promise.resolve({ rows: [], rowCount: 0 });
  });
});

afterAll(async () => {
  await server.close();
});

describe("Delete tag_type", () => {

  test("DELETE /api/v1/tags/type/:id", async () => {

    const response = await server.inject({
      method: "DELETE",
      cookies: { session: sessionCookie },
      url: `/api/v1/tags/type/${tagType.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(TagTypeSchema.parse(response.json())).toEqual(tagType);
  });

  test("DELETE returns 404", async () => {

    const response = await server.inject({
      method: "DELETE",
      cookies: { session: sessionCookie },
      url: `/api/v1/tag/type/999`,
    });

    expect(response.statusCode).toBe(404);
  });

});