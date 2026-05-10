import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { BlogSchema, type Blog } from "@viernulvier/shared/index.js";
import { HttpSuccess, HttpClientError } from "@/routes/helpers.js";

vi.mock("@/plugins/authorize.js", () => import("@mocks/plugins/authorize.js"));

let server: FastifyInstance;
let sessionCookie: string;

const originalBlog: Blog = { id: 1, name: "Tech Blog", description: "All about tech" };

const updatedBlogName: Blog = {
  ...originalBlog,
  name: "Updated Tech Blog",
};

const updatedBlogDescription: Blog = {
  ...originalBlog,
  description: "New description",
};

const updatedBlogClearDescription: Blog = {
  ...originalBlog,
  description: null,
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

describe("Edit on blog route", () => {
  test("PATCH /api/v1/blog/:id — updates name", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [updatedBlogName], rowCount: 1 });
      }

      throw new Error(`Unexpected query in edit tests: ${query}`);
    });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/blog/${originalBlog["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        name: updatedBlogName["name"],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(BlogSchema.parse(response.json())).toEqual(updatedBlogName);
  });

  test("PATCH /api/v1/blog/:id — updates description", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [updatedBlogDescription], rowCount: 1 });
      }

      throw new Error(`Unexpected query in edit tests: ${query}`);
    });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/blog/${originalBlog["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        description: updatedBlogDescription["description"],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(BlogSchema.parse(response.json())).toEqual(updatedBlogDescription);
  });

  test("PATCH /api/v1/blog/:id — clears description to null", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [updatedBlogClearDescription], rowCount: 1 });
      }

      throw new Error(`Unexpected query in edit tests: ${query}`);
    });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/blog/${originalBlog["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        description: null,
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(BlogSchema.parse(response.json())).toEqual(updatedBlogClearDescription);
  });

  test("PATCH /api/v1/blog/:id — returns 404 when blog not found", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      throw new Error(`Unexpected query in edit tests: ${query}`);
    });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/blog/${originalBlog["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        name: "Nonexistent blog",
      },
    });

    expect(response.statusCode).toBe(HttpClientError.NotFound);
  });

  test("PATCH /api/v1/blog/:id — rejects invalid body (wrong type)", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/blog/${originalBlog["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        name: 12345,
      },
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });

  test("PATCH /api/v1/blog/:id — rejects empty body", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/blog/${originalBlog["id"]}`,
      cookies: { session: sessionCookie },
      payload: {},
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });

  test("PATCH /api/v1/blog/:id — returns 401 when not logged in", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/blog/${originalBlog["id"]}`,
      payload: {
        name: "Unauthorized update",
      },
    });

    expect(response.statusCode).toBe(HttpClientError.Unauthorized);
  });
});
