import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { BlogPostSchema, type BlogPost } from "@viernulvier/shared/index.js";
import { HttpSuccess, HttpClientError } from "@/routes/helpers.js";

vi.mock("@/plugins/authorize.js", () => import("@mocks/plugins/authorize.js"));

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
  test("POST /api/v1/blog/post — creates a blogpost and returns it", async () => {
    server.pg.query = vi.fn().mockResolvedValue({ rows: [mockBlogPost], rowCount: 1 });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/blog/post",
      cookies: { session: sessionCookie },
      payload: {
        blog: mockBlogPost["blog"],
        title: mockBlogPost["title"],
        content: mockBlogPost["content"],
        published_at: mockBlogPost["published_at"],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(BlogPostSchema.parse(response.json())).toMatchObject({ id: mockBlogPost["id"], title: mockBlogPost["title"] });
  });

  test("POST /api/v1/blog/post — creates a draft blogpost (null published_at)", async () => {
    server.pg.query = vi.fn().mockResolvedValue({ rows: [mockDraftBlogPost], rowCount: 1 });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/blog/post",
      cookies: { session: sessionCookie },
      payload: {
        blog: mockDraftBlogPost["blog"],
        title: mockDraftBlogPost["title"],
        content: mockDraftBlogPost["content"],
        published_at: null,
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(response.json()["published_at"]).toBeNull();
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

  test("POST /api/v1/blog/post — returns 401 when not logged in", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/blog/post",
      payload: {
        blog: mockBlogPost["blog"],
        title: mockBlogPost["title"],
        content: mockBlogPost["content"],
        published_at: null,
      },
    });

    expect(response.statusCode).toBe(HttpClientError.Unauthorized);
  });
});
