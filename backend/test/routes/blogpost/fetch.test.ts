import { describe, test, expect, beforeAll, afterAll, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { BlogPostSchema, BlogPostWithBackwardsRefsSchema, type BlogPostWithMeta, type BlogPostWithBackwardsRefs } from "@viernulvier/shared/index.js";
import { HttpSuccess, HttpClientError } from "@/routes/helpers.js";

vi.mock("@/plugins/authorize.js", () => import("@mocks/plugins/authorize.js"));

let server: FastifyInstance;
let sessionCookie: string;

const mockTime = new Date();

const mockBlogPosts: Array<BlogPostWithBackwardsRefs> = [
  { id: 1, blog: 1, title: { en: "First Post" }, content: { en: "Hello world" }, published_at: mockTime, productions: [1, 2] },
  { id: 2, blog: 1, title: { en: "Draft Post" }, content: { en: "Work in progress" }, published_at: null, productions: [] },
];

const mockBlogPostsWithMeta: Array<BlogPostWithMeta> = mockBlogPosts.map((post) => ({
  ...post,
  created_by: 1,
  created_at: mockTime,
  updated_by: 1,
  updated_at: mockTime,
}));

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 1, username: "Admin1" });

  server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
    const upper = query.trim().toUpperCase();
    const isMeta = upper.includes("CREATED_AT");
    const id = params?.[0] !== undefined ? Number(params[0]) : undefined;

    if (isMeta) {
      const rows = id !== undefined
        ? mockBlogPostsWithMeta.filter((p) => p["id"] === id)
        : mockBlogPostsWithMeta;
      return Promise.resolve({ rows, rowCount: rows.length });
    }

    if (upper.startsWith("SELECT")) {
      const rows = id !== undefined
        ? mockBlogPosts.filter((p) => p["id"] === id)
        : mockBlogPosts;
      return Promise.resolve({ rows, rowCount: rows.length });
    }

    throw new Error(`Unexpected query in fetch tests: ${query}`);
  });
});

afterAll(async () => {
  await server.close();
});

describe("BlogPost fetch routes", () => {
  test("GET /api/v1/blog/post -> returns all blogposts", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/blog/post",
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const posts = response.json() as BlogPostWithBackwardsRefs[];
    expect(posts).toHaveLength(mockBlogPosts.length);
    expect(posts[0]?.productions).toEqual([1, 2]);
    expect(posts[1]?.productions).toEqual([]);
  });

  test("GET /api/v1/blog/post/:id -> returns a single blogpost", async () => {
    const post = mockBlogPosts[0];

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/blog/post/${post?.["id"]}`,
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const parsed = BlogPostWithBackwardsRefsSchema.parse(response.json());
    expect(parsed).toMatchObject({ id: post?.["id"], title: post?.["title"] });
    expect(parsed.productions).toEqual([1, 2]);
  });

  test("GET /api/v1/blog/post/:id -> returns a blogpost with null published_at", async () => {
    const post = mockBlogPosts[1];

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/blog/post/${post?.["id"]}`,
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(response.json()["published_at"]).toBeNull();
  });

  test("GET /api/v1/blog/post/:id/meta — returns a blogpost with metadata", async () => {
    const post = mockBlogPostsWithMeta[0];

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/blog/post/${post?.["id"]}/meta`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(BlogPostSchema.withMeta().parse(response.json())).toMatchObject({ id: post?.["id"] });
  });

  test("GET /api/v1/blog/post/:id — returns 404 when blogpost not found", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/blog/post/99999",
    });

    expect(response.statusCode).toBe(HttpClientError.NotFound);
  });

  test("GET /api/v1/blog/post/:id/meta — returns 404 when blogpost not found", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/blog/post/99999/meta",
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(HttpClientError.NotFound);
  });

  test("GET /api/v1/blog/post/:id — returns 400 when id is invalid", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/blog/post/invalid",
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });

  test("GET /api/v1/blog/post/:id/meta — returns 401 when not logged in", async () => {
    const post = mockBlogPostsWithMeta[0];

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/blog/post/${post?.["id"]}/meta`,
    });

    expect(response.statusCode).toBe(HttpClientError.Unauthorized);
  });
});
