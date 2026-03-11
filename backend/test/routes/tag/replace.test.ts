import { describe, test, expect, beforeAll, vi, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { TagSchema, type Tag } from "@viernulvier/shared/index.js";

let server: FastifyInstance;
let sessionCookie: string;

const mockTag: Tag = {
  id: 5,
  name: { en: "Music", nl: "Muziek" },
  type: 1,
  productions: [],
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

  server.pg.query = vi.fn().mockResolvedValue({
    rows: [mockTag],
    rowCount: 1,
  });
});

afterAll(async () => {
  await server.close();
});

describe("Replace tag", () => {
  test("PUT /api/v1/tags/:id", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/tags/${mockTag.id}`,
      cookies: { session: sessionCookie },
      payload: {
        name: mockTag.name,
        type: mockTag.type,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(TagSchema.parse(response.json())).toEqual(mockTag);
  });
});