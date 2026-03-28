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
  server.pg.query = vi.fn().mockResolvedValue({
    rows: [mockTag],
    rowCount: 1,
  });
});

describe("Edit tag", () => {
  test("PATCH /api/v1/tags/:id name only", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/tags/${mockTag.id}`,
      cookies: { session: sessionCookie },
      payload: { name: mockTag.name },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(TagSchema.parse(response.json())).toEqual(mockTag);
  });

  test("PATCH /api/v1/tags/:id type only", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/tags/${mockTag.id}`,
      cookies: { session: sessionCookie },
      payload: { type: mockTag.type },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
  });

  test("PATCH /api/v1/tags/:id public only", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/tags/${mockTag.id}`,
      cookies: { session: sessionCookie },
      payload: { public: mockTag.public },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
  });

  test("PATCH /api/v1/tags/:id all fields", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/tags/${mockTag.id}`,
      cookies: { session: sessionCookie },
      payload: { name: mockTag.name, type: mockTag.type, public: mockTag.public },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
  });

  test("PATCH /api/v1/tags/:id — returns 404 when tag not found", async () => {
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [],
      rowCount: 0,
    });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/tags/${mockTag.id}`,
      cookies: { session: sessionCookie },
      payload: { name: mockTag.name },
    });

    expect(response.statusCode).toBe(HttpClientError.NotFound);
  });
});
