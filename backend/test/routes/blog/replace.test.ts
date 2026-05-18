import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { BlogSchema, type Blog } from "@viernulvier/shared/index.js";
import { HttpSuccess, HttpClientError } from "@/routes/helpers.js";

vi.mock("@/plugins/authorize.js", () => import("@mocks/plugins/authorize.js"));

let server: FastifyInstance;
let sessionCookie: string;

const replacedBlog: Blog = { id: 1, name: { en: "New Blog Name" }, description: { en: "Updated description" } };

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

describe("Replace on blog route", () => {
  test("PUT /api/v1/blog/:id — replaces a blog and returns it", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [replacedBlog], rowCount: 1 });
      }

      throw new Error(`Unexpected query in replace tests: ${query}`);
    });

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/blog/${replacedBlog["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        name: replacedBlog["name"],
        description: replacedBlog["description"],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(BlogSchema.parse(response.json())).toEqual(replacedBlog);
  });

  test("PUT /api/v1/blog/:id — replaces a blog with a null description", async () => {
    const replacedBlogNoDescription: Blog = { ...replacedBlog, description: null };
    server.pg.query = vi.fn().mockResolvedValue({ rows: [replacedBlogNoDescription], rowCount: 1 });

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/blog/${replacedBlog["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        name: replacedBlogNoDescription["name"],
        description: null,
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(BlogSchema.parse(response.json())).toEqual(replacedBlogNoDescription);
  });

  test("PUT /api/v1/blog/:id — returns 404 when blog not found", async () => {
    server.pg.query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/blog/${replacedBlog["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        name: replacedBlog["name"],
        description: replacedBlog["description"],
      },
    });

    expect(response.statusCode).toBe(HttpClientError.NotFound);
  });

  test("PUT /api/v1/blog/:id — rejects invalid body (missing name)", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/blog/${replacedBlog["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        description: "Only description, no name",
      },
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });

  test("PUT /api/v1/blog/:id — returns 401 when not logged in", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/blog/${replacedBlog["id"]}`,
      payload: {
        name: replacedBlog["name"],
        description: replacedBlog["description"],
      },
    });

    expect(response.statusCode).toBe(HttpClientError.Unauthorized);
  });
});
