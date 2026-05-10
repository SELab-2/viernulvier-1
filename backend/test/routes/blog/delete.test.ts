import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { BlogSchema, type Blog } from "@viernulvier/shared/index.js";
import { HttpSuccess, HttpClientError } from "@/routes/helpers.js";

vi.mock("@/plugins/authorize.js", () => import("@mocks/plugins/authorize.js"));

let server: FastifyInstance;
let sessionCookie: string;

const mockBlog: Blog = { id: 1, name: "Tech Blog", description: "All about tech" };

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 1, username: "Admin1" });
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("Delete on blog route", () => {
  test("DELETE /api/v1/blog/:id — deletes a blog and returns it", async () => {
    server.pg.query = vi.fn().mockResolvedValue({ rows: [mockBlog], rowCount: 1 });

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/blog/${mockBlog?.["id"]}`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(BlogSchema.parse(response.json())).toEqual(mockBlog);
  });

  test("DELETE /api/v1/blog/:id — returns 404 when blog not found", async () => {
    server.pg.query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/blog/${mockBlog?.["id"]}`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(HttpClientError.NotFound);
  });

  test("DELETE /api/v1/blog/:id — returns 401 when not logged in", async () => {
    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/blog/${mockBlog?.["id"]}`,
    });

    expect(response.statusCode).toBe(HttpClientError.Unauthorized);
  });
});
