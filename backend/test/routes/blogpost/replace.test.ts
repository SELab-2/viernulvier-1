import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { BlogPostSchema, type BlogPost } from "@viernulvier/shared/index.js";
import { HttpSuccess, HttpClientError } from "@/routes/helpers.js";

let server: FastifyInstance;
let sessionCookie: string;

const mockTime = new Date();

const replacedBlogPost: BlogPost = {
  id: 1,
  blog: 1,
  title: "Updated Title",
  content: { body: "Updated content" },
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

describe("Replace on blogpost route", () => {
  test("PUT /api/v1/blog/post/:id — replaces a blogpost with productions and returns it", async () => {
    let callCount = 0;
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();
      callCount++;

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [replacedBlogPost], rowCount: 1 });
      } else if (upper.startsWith("DELETE")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      } else if (upper.startsWith("INSERT")) {
        return Promise.resolve({ rows: [{}], rowCount: 1 });
      }

      throw new Error(`Unexpected query in replace tests: ${query}`);
    });

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/blog/post/${replacedBlogPost["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        blog: replacedBlogPost["blog"],
        title: replacedBlogPost["title"],
        content: replacedBlogPost["content"],
        published_at: replacedBlogPost["published_at"],
        productions: [1, 2],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(BlogPostSchema.parse(response.json())).toMatchObject({ id: replacedBlogPost["id"], title: replacedBlogPost["title"] });
    // Should have called pg.query 4 times: 1 UPDATE + 1 DELETE + 2 INSERT
    expect(server.pg.query).toHaveBeenCalledTimes(4);
  });

  test("PUT /api/v1/blog/post/:id — replaces a blogpost and returns it", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [replacedBlogPost], rowCount: 1 });
      } else if (upper.startsWith("DELETE")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      } else if (upper.startsWith("INSERT")) {
        return Promise.resolve({ rows: [{}], rowCount: 1 });
      }

      throw new Error(`Unexpected query in replace tests: ${query}`);
    });

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/blog/post/${replacedBlogPost["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        blog: replacedBlogPost["blog"],
        title: replacedBlogPost["title"],
        content: replacedBlogPost["content"],
        published_at: replacedBlogPost["published_at"],
        productions: [1],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(BlogPostSchema.parse(response.json())).toMatchObject({ id: replacedBlogPost["id"], title: replacedBlogPost["title"] });
  });

  test("PUT /api/v1/blog/post/:id — rejects empty productions array", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/blog/post/${replacedBlogPost["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        blog: replacedBlogPost["blog"],
        title: replacedBlogPost["title"],
        content: replacedBlogPost["content"],
        published_at: replacedBlogPost["published_at"],
        productions: [],
      },
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });

  test("PUT /api/v1/blog/post/:id — replaces a blogpost with null published_at (draft)", async () => {
    const draft: BlogPost = { ...replacedBlogPost, published_at: null };
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [draft], rowCount: 1 });
      } else if (upper.startsWith("DELETE")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      } else if (upper.startsWith("INSERT")) {
        return Promise.resolve({ rows: [{}], rowCount: 1 });
      }

      throw new Error(`Unexpected query in replace tests: ${query}`);
    });

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/blog/post/${replacedBlogPost["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        blog: draft["blog"],
        title: draft["title"],
        content: draft["content"],
        published_at: null,
        productions: [1],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(response.json()["published_at"]).toBeNull();
  });

  test("PUT /api/v1/blog/post/:id — returns 404 when blogpost not found", async () => {
    server.pg.query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/blog/post/${replacedBlogPost["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        blog: replacedBlogPost["blog"],
        title: replacedBlogPost["title"],
        content: replacedBlogPost["content"],
        published_at: null,
        productions: [1],
      },
    });

    expect(response.statusCode).toBe(HttpClientError.NotFound);
  });

  test("PUT /api/v1/blog/post/:id — rejects invalid body (missing productions)", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/blog/post/${replacedBlogPost["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        blog: 1,
        content: { body: "No title" },
        published_at: null,
      },
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });

  test("PUT /api/v1/blog/post/:id — rejects invalid body (missing title)", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/blog/post/${replacedBlogPost["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        blog: 1,
        content: { body: "No title" },
        published_at: null,
        productions: [1],
      },
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });

  test("PUT /api/v1/blog/post/:id — returns 401 when not logged in", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/blog/post/${replacedBlogPost["id"]}`,
      payload: {
        blog: replacedBlogPost["blog"],
        title: replacedBlogPost["title"],
        content: replacedBlogPost["content"],
        published_at: null,
        productions: [],
      },
    });

    expect(response.statusCode).toBe(HttpClientError.Unauthorized);
  });
});
