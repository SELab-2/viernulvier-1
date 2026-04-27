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
  title: "First Post",
  content: { body: "Hello world" },
  published_at: mockTime,
};

const mockDraftBlogPost: BlogPost = {
  id: 2,
  blog: 1,
  title: "Draft Post",
  content: { body: "Work in progress" },
  published_at: null,
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

describe("Create on blogpost route", () => {
  test("POST /api/v1/blog/post — creates a blogpost with productions and returns it", async () => {
    let callCount = 0;
    server.pg.query = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call: INSERT into blogpost
        return Promise.resolve({ rows: [mockBlogPost], rowCount: 1 });
      } else {
        // Subsequent calls: INSERT into production_blogpost
        return Promise.resolve({ rows: [{}], rowCount: 1 });
      }
    });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/blog/post",
      cookies: { session: sessionCookie },
      payload: {
        blog: mockBlogPost["blog"],
        title: mockBlogPost["title"],
        content: mockBlogPost["content"],
        published_at: mockBlogPost["published_at"],
        productions: [1, 2, 3],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(BlogPostSchema.parse(response.json())).toMatchObject({ id: mockBlogPost["id"], title: mockBlogPost["title"] });
    // Should have called pg.query 4 times: 1 for blogpost insert + 3 for production relations
    expect(server.pg.query).toHaveBeenCalledTimes(4);
  });

  test("POST /api/v1/blog/post — rejects empty productions array", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/blog/post",
      cookies: { session: sessionCookie },
      payload: {
        blog: mockBlogPost["blog"],
        title: mockBlogPost["title"],
        content: mockBlogPost["content"],
        published_at: mockBlogPost["published_at"],
        productions: [],
      },
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });

  test("POST /api/v1/blog/post — creates a draft blogpost with productions (null published_at)", async () => {
    let callCount = 0;
    server.pg.query = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ rows: [mockDraftBlogPost], rowCount: 1 });
      } else {
        return Promise.resolve({ rows: [{}], rowCount: 1 });
      }
    });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/blog/post",
      cookies: { session: sessionCookie },
      payload: {
        blog: mockDraftBlogPost["blog"],
        title: mockDraftBlogPost["title"],
        content: mockDraftBlogPost["content"],
        published_at: null,
        productions: [1],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(response.json()["published_at"]).toBeNull();
    // Should have called pg.query twice: 1 for blogpost insert + 1 for production relation
    expect(server.pg.query).toHaveBeenCalledTimes(2);
  });

  test("POST /api/v1/blog/post — returns 404 when insert returns no row", async () => {
    server.pg.query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/blog/post",
      cookies: { session: sessionCookie },
      payload: {
        blog: mockBlogPost["blog"],
        title: mockBlogPost["title"],
        content: mockBlogPost["content"],
        published_at: null,
        productions: [1],
      },
    });

    expect(response.statusCode).toBe(HttpClientError.NotFound);
  });

  test("POST /api/v1/blog/post — rejects invalid body (missing title)", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/blog/post",
      cookies: { session: sessionCookie },
      payload: {
        blog: 1,
        content: { body: "No title provided" },
        published_at: null,
        productions: [1],
      },
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });

  test("POST /api/v1/blog/post — rejects invalid body (missing blog)", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/blog/post",
      cookies: { session: sessionCookie },
      payload: {
        title: "No blog FK",
        content: { body: "Missing blog reference" },
        published_at: null,
        productions: [1],
      },
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });

  test("POST /api/v1/blog/post — rejects empty body", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/blog/post",
      cookies: { session: sessionCookie },
      payload: {},
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });

  test("POST /api/v1/blog/post — rejects invalid productions (not an array)", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/blog/post",
      cookies: { session: sessionCookie },
      payload: {
        blog: mockBlogPost["blog"],
        title: mockBlogPost["title"],
        content: mockBlogPost["content"],
        published_at: null,
        productions: "not-an-array",
      },
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });

  test("POST /api/v1/blog/post — returns 401 when not logged in", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/blog/post",
      payload: {
        blog: mockBlogPost["blog"],
        title: mockBlogPost["title"],
        content: mockBlogPost["content"],
        published_at: null,
        productions: [],
      },
    });

    expect(response.statusCode).toBe(HttpClientError.Unauthorized);
  });
});
