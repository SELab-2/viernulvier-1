import { describe, test, expect, beforeAll, afterAll, vi } from "vitest";
import { buildServer } from "@/server.js";
import { TagTypeSchema, type TagType } from "@viernulvier/shared/index.js";
import type { FastifyInstance } from "fastify";

let server: FastifyInstance;
let sessionCookie: string;

const tagType: TagType = {
  id: 1,
  name: { en: "Genre", nl: "Genre" },
  visible: true,
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

  server.pg.query = vi.fn().mockImplementation((query: string) => {

    if (query.includes("INSERT")) {
      return Promise.resolve({
        rows: [{
          id: tagType.id,
          name: tagType.name,
          visible: tagType.visible
        }],
        rowCount: 1,
      });
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

describe("Create tag_type", () => {

  test("POST /api/v1/tag/type", async () => {

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/tag/type",
      cookies: { session: sessionCookie },
      payload: {
        name: tagType.name,
        visible: tagType.visible,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(TagTypeSchema.parse(response.json())).toEqual(tagType);
  });

  test("POST invalid body", async () => {

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/tag/type",
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

});