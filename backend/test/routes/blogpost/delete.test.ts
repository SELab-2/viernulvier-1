import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { BlogPostSchema, type BlogPost } from "@viernulvier/shared/index.js";
import { HttpSuccess, HttpClientError } from "@/routes/helpers.js";

let server: FastifyInstance;
let sessionCookie: string;

const mockTime = new Date();

const mockBlogPost: BlogPost = {
  id: 1,
  blog: 1,
  title: "Post to Delete",
  content: { body: "Goodbye" },
  published_at: mockTime,
};

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

describe("Delete on blogpost route", () => {
  test("DELETE /api/v1/blogpost/:id — deletes a blogpost and returns it", async () => {
    server.pg.query = vi.fn().mockResolvedValue({ rows: [mockBlogPost], rowCount: 1 });

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/blogpost/${mockBlogPost["id"]}`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(BlogPostSchema.parse(response.json())).toMatchObject({ id: mockBlogPost["id"], title: mockBlogPost["title"] });
  });

  test("DELETE /api/v1/blogpost/:id — returns 404 when blogpost not found", async () => {
    server.pg.query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/blogpost/${mockBlogPost["id"]}`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(HttpClientError.NotFound);
  });

  test("DELETE /api/v1/blogpost/:id — returns 400 when id is invalid", async () => {
    const response = await server.inject({
      method: "DELETE",
      url: "/api/v1/blogpost/invalid",
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });

  test("DELETE /api/v1/blogpost/:id — returns 401 when not logged in", async () => {
    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/blogpost/${mockBlogPost["id"]}`,
    });

    expect(response.statusCode).toBe(HttpClientError.Unauthorized);
  });
});
