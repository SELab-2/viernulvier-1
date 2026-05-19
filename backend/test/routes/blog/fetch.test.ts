import { describe, test, expect, beforeAll, afterAll, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { BlogSchema, type Blog, type BlogWithMeta } from "@viernulvier/shared/index.js";
import { HttpSuccess, HttpClientError } from "@/routes/helpers.js";

vi.mock("@/plugins/authorize.js", () => import("@mocks/plugins/authorize.js"));

let server: FastifyInstance;
let sessionCookie: string;

const mockBlogs: Array<Blog> = [
  { id: 1, name: { en: "Tech Blog" }, description: { en: "All about tech" } },
  { id: 2, name: { en: "Art Blog" }, description: null },
];

const mockTime = new Date();
const mockBlogsWithMeta: Array<BlogWithMeta> = mockBlogs.map((blog) => ({
  ...blog,
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
        ? mockBlogsWithMeta.filter((b) => b["id"] === id)
        : mockBlogsWithMeta;
      return Promise.resolve({ rows, rowCount: rows.length });
    }

    if (upper.startsWith("SELECT")) {
      const rows = id !== undefined
        ? mockBlogs.filter((b) => b["id"] === id)
        : mockBlogs;
      return Promise.resolve({ rows, rowCount: rows.length });
    }

    throw new Error(`Unexpected query in fetch tests: ${query}`);
  });
});

afterAll(async () => {
  await server.close();
});

describe("Blog fetch routes", () => {
  test("GET /api/v1/blog -> returns all blogs", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/blog",
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(response.json()).toEqual(mockBlogs);
  });

  test("GET /api/v1/blog/:id -> returns a single blog", async () => {
    const blog = mockBlogs[0];

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/blog/${blog?.["id"]}`,
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(BlogSchema.parse(response.json())).toEqual(blog);
  });

  test("GET /api/v1/blog/:id -> returns a blog with a null description", async () => {
    const blog = mockBlogs[1];

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/blog/${blog?.["id"]}`,
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(BlogSchema.parse(response.json())).toEqual(blog);
  });

  test("GET /api/v1/blog/:id/meta — returns a blog with metadata", async () => {
    const blog = mockBlogsWithMeta[0];

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/blog/${blog?.["id"]}/meta`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(BlogSchema.withMeta().parse(response.json())).toEqual(blog);
  });

  test("GET /api/v1/blog/:id — returns 404 when blog not found", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/blog/99999",
    });

    expect(response.statusCode).toBe(HttpClientError.NotFound);
  });

  test("GET /api/v1/blog/:id/meta — returns 404 when blog not found", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/blog/99999/meta",
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(HttpClientError.NotFound);
  });

  test("GET /api/v1/blog/:id — returns 400 when id is invalid", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/blog/invalid",
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });

  test("GET /api/v1/blog/:id/meta — returns 401 when not logged in", async () => {
    const blog = mockBlogsWithMeta[0];

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/blog/${blog?.["id"]}/meta`,
    });

    expect(response.statusCode).toBe(HttpClientError.Unauthorized);
  });
});
