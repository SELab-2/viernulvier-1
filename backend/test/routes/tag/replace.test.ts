import { describe, test, expect, beforeAll, beforeEach, vi, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { TagSchema, type Tag } from "@viernulvier/shared/index.js";
import { HttpSuccess, HttpClientError } from "@/routes/helpers.js";

let server: FastifyInstance;
let sessionCookie: string;

const mockTag: Tag = {
  id: 5,
  old_id: 111,
  name: { en: "Music", nl: "Muziek" },
  tag_type: 1,
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

describe("Replace tag", () => {
  test("PUT /api/v1/tags/:id", async () => {
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [mockTag],
      rowCount: 1,
    });

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/tags/${mockTag.id}`,
      cookies: { session: sessionCookie },
      payload: {
        old_id: mockTag.old_id,
        name: mockTag.name,
        tag_type: mockTag.tag_type,
        public: mockTag.public,
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(TagSchema.parse(response.json())).toEqual(mockTag);
  });

  test("PUT /api/v1/tags/:id — returns 404 when tag not found", async () => {
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [],
      rowCount: 0,
    });

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/tags/${mockTag.id}`,
      cookies: { session: sessionCookie },
      payload: {
        name: mockTag.name,
        tag_type: mockTag.tag_type,
        public: mockTag.public,
      },
    });

    expect(response.statusCode).toBe(HttpClientError.NotFound);
  });

  test("PUT /api/v1/tags/:id — rejects invalid body", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/tags/${mockTag.id}`,
      cookies: { session: sessionCookie },
      payload: {
        name: mockTag.name,
        tag_type: mockTag.tag_type,
      },
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });
});
