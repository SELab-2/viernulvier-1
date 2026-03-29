import { describe, test, expect, beforeAll, vi, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { TagSchema, type Tag } from "@viernulvier/shared/index.js";

let server: FastifyInstance;
let sessionCookie: string;

const mockTag: Tag = {
  id: 5,
  old_id: 111,
  name: { en: "Music", nl: "Muziek" },
  type: 1,
  productions: [],
  public: true,
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

describe("Create tag", () => {
  test("POST /api/v1/tags", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/tags",
      cookies: { session: sessionCookie },
      payload: {
        old_id: mockTag.old_id,
        name: mockTag.name,
        type: mockTag.type,
        public: mockTag.public,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(TagSchema.parse(response.json())).toEqual(mockTag);
  });

  test("POST /api/v1/tags invalid body", async () => {
    const response = await server.inject({
      method: "POST",
      cookies: { session: sessionCookie },
      url: "/api/v1/tags",
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });
});