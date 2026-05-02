import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { BlogSchema, type Blog } from "@viernulvier/shared/index.js";
import { HttpSuccess, HttpClientError } from "@/routes/helpers.js";

vi.mock("@/plugins/authorize.js", () => import("@mocks/plugins/authorize.js"));

let server: FastifyInstance;
let sessionCookie: string;

const mockBlog: Blog = { id: 1, name: "Tech Blog", description: "All about tech" };
const mockBlogNoDescription: Blog = { id: 2, name: "Art Blog", description: null };

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

describe("Create on blog route", () => {
  test("POST /api/v1/blog — creates a blog and returns it", async () => {
    server.pg.query = vi.fn().mockResolvedValue({ rows: [mockBlog], rowCount: 1 });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/blog",
      cookies: { session: sessionCookie },
      payload: {
        name: mockBlog["name"],
        description: mockBlog["description"],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(BlogSchema.parse(response.json())).toEqual(mockBlog);
  });

  test("POST /api/v1/blog — creates a blog without a description", async () => {
    server.pg.query = vi.fn().mockResolvedValue({ rows: [mockBlogNoDescription], rowCount: 1 });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/blog",
      cookies: { session: sessionCookie },
      payload: {
        name: mockBlogNoDescription["name"],
        description: null,
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(BlogSchema.parse(response.json())).toEqual(mockBlogNoDescription);
  });

  test("POST /api/v1/blog — returns 404 when insert returns no row", async () => {
    server.pg.query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/blog",
      cookies: { session: sessionCookie },
      payload: {
        name: mockBlog["name"],
        description: mockBlog["description"],
      },
    });

    expect(response.statusCode).toBe(HttpClientError.NotFound);
  });

  test("POST /api/v1/blog — rejects invalid body (missing name)", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/blog",
      cookies: { session: sessionCookie },
      payload: {
        description: "No name provided",
      },
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });

  test("POST /api/v1/blog — rejects empty body", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/blog",
      cookies: { session: sessionCookie },
      payload: {},
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });

  test("POST /api/v1/blog — returns 401 when not logged in", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/blog",
      payload: {
        name: mockBlog["name"],
        description: mockBlog["description"],
      },
    });

    expect(response.statusCode).toBe(HttpClientError.Unauthorized);
  });
});
