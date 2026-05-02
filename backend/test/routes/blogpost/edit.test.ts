import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { BlogPostSchema, type BlogPost } from "@viernulvier/shared/index.js";
import { HttpSuccess, HttpClientError } from "@/routes/helpers.js";

vi.mock("@/plugins/authorize.js", () => import("@mocks/plugins/authorize.js"));

let server: FastifyInstance;
let sessionCookie: string;

const mockTime = new Date();

const originalBlogPost: BlogPost = {
  id: 1,
  blog: 1,
  title: "Original Title",
  content: { body: "Original content" },
  published_at: mockTime,
};

const updatedTitle: BlogPost = { ...originalBlogPost, title: "Updated Title" };
const updatedContent: BlogPost = { ...originalBlogPost, content: { body: "Updated content" } };
const publishedPost: BlogPost = { ...originalBlogPost, published_at: mockTime };
const draftPost: BlogPost = { ...originalBlogPost, published_at: null };

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

describe("Edit on blogpost route", () => {
  test("PATCH /api/v1/blog/post/:id — updates title", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [updatedTitle], rowCount: 1 });
      }

      throw new Error(`Unexpected query in edit tests: ${query}`);
    });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/blog/post/${originalBlogPost["id"]}`,
      cookies: { session: sessionCookie },
      payload: { title: updatedTitle["title"] },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(BlogPostSchema.parse(response.json())).toMatchObject({ title: updatedTitle["title"] });
  });

  test("PATCH /api/v1/blog/post/:id — updates content", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [updatedContent], rowCount: 1 });
      }

      throw new Error(`Unexpected query in edit tests: ${query}`);
    });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/blog/post/${originalBlogPost["id"]}`,
      cookies: { session: sessionCookie },
      payload: { content: updatedContent["content"] },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(response.json()["content"]).toEqual(updatedContent["content"]);
  });

  test("PATCH /api/v1/blog/post/:id — publishes a draft (sets published_at)", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [publishedPost], rowCount: 1 });
      }

      throw new Error(`Unexpected query in edit tests: ${query}`);
    });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/blog/post/${originalBlogPost["id"]}`,
      cookies: { session: sessionCookie },
      payload: { published_at: mockTime },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(response.json()["published_at"]).not.toBeNull();
  });

  test("PATCH /api/v1/blog/post/:id — reverts to draft (clears published_at)", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [draftPost], rowCount: 1 });
      }

      throw new Error(`Unexpected query in edit tests: ${query}`);
    });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/blog/post/${originalBlogPost["id"]}`,
      cookies: { session: sessionCookie },
      payload: { published_at: null },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(response.json()["published_at"]).toBeNull();
  });

  test("PATCH /api/v1/blog/post/:id — returns 404 when blogpost not found", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      throw new Error(`Unexpected query in edit tests: ${query}`);
    });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/blog/post/${originalBlogPost["id"]}`,
      cookies: { session: sessionCookie },
      payload: { title: "Nonexistent post" },
    });

    expect(response.statusCode).toBe(HttpClientError.NotFound);
  });

  test("PATCH /api/v1/blog/post/:id — rejects invalid body (wrong type)", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/blog/post/${originalBlogPost["id"]}`,
      cookies: { session: sessionCookie },
      payload: { title: 12345 },
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });

  test("PATCH /api/v1/blog/post/:id — rejects empty body", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/blog/post/${originalBlogPost["id"]}`,
      cookies: { session: sessionCookie },
      payload: {},
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });

  test("PATCH /api/v1/blog/post/:id — returns 401 when not logged in", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/blog/post/${originalBlogPost["id"]}`,
      payload: { title: "Unauthorized update" },
    });

    expect(response.statusCode).toBe(HttpClientError.Unauthorized);
  });
});
