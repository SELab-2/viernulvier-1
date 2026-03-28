import { describe, test, expect, beforeAll, beforeEach, vi, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { TagSchema, type Tag } from "@viernulvier/shared/index.js";
import { HttpSuccess, HttpClientError } from "@/routes/helpers.js";

let server: FastifyInstance;
let sessionCookie: string;

const mockTag: Tag = {
  id: 5,
  name: { en: "Music", nl: "Muziek" },
  type: 1,
  productions: [],
  public: true,
};

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 1, username: "Admin" });

  server.addHook("preHandler", (request, _, done) => {
    if (!request.user) {
      request.user = { id: 1 };
    }
    done();
  });
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("Create tag", () => {
  test("POST /api/v1/tags", async () => {
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [mockTag],
      rowCount: 1,
    });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/tags",
      cookies: { session: sessionCookie },
      payload: {
        name: mockTag.name,
        type: mockTag.type,
        public: mockTag.public,
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(TagSchema.parse(response.json())).toEqual(mockTag);
  });

  test("POST /api/v1/tags — returns 404 when insert returns no row", async () => {
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [],
      rowCount: 0,
    });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/tags",
      cookies: { session: sessionCookie },
      payload: {
        name: mockTag.name,
        type: mockTag.type,
        public: mockTag.public,
      },
    });

    expect(response.statusCode).toBe(HttpClientError.NotFound);
  });

  test("POST /api/v1/tags invalid body", async () => {
    const response = await server.inject({
      method: "POST",
      cookies: { session: sessionCookie },
      url: "/api/v1/tags",
      payload: {},
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });
});
