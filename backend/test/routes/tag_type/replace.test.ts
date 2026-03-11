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

  server.addHook('preHandler', (request, _, done) => {
    if (!request.user) {
      request.user = { id: 1 };
    }
    done();
  });

  server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {

    if (query.includes("UPDATE")) {
      const id = Number(params?.[params.length - 1]);

      if (id === tagType.id) {
        return Promise.resolve({
          rows: [{
            id: tagType.id,
            name: tagType.name,
          }],
          rowCount: 1,
        });
      }

      return Promise.resolve({ rows: [], rowCount: 0 });
    }

    if (query.includes("SELECT")) {
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

describe("Replace tag_type", () => {

  test("PUT /api/v1/tags/type/:id", async () => {

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/tags/type/${tagType.id}`,
      cookies: { session: sessionCookie },
      payload: {
        name: tagType.name,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(TagTypeSchema.parse(response.json())).toEqual(tagType);
  });

});