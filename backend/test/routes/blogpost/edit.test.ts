import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { BlogPostWithBackwardsRefsSchema, type BlogPost } from "@viernulvier/shared/index.js";
import { HttpSuccess, HttpClientError, HttpServerError } from "@/routes/helpers.js";

vi.mock("@/plugins/authorize.js", () => import("@mocks/plugins/authorize.js"));

let server: FastifyInstance;
let sessionCookie: string;

const mockTime = new Date();

const originalBlogPost: BlogPost = {
  id: 1,
  blog: 1,
  title: {en: "Original Title" },
  content: { en: "Original content" },
  published_at: mockTime,
};

const updatedTitle: BlogPost = { ...originalBlogPost, title: {en: "Updated Title" } };
const updatedContent: BlogPost = { ...originalBlogPost, content: { en: "Updated content" } };
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
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "COMMIT") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("UPDATE")) {
          return Promise.resolve({ rows: [updatedTitle], rowCount: 1 });
        }
        if (upper.startsWith("SELECT PRODUCTION FROM PRODUCTION_BLOGPOST")) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }

        throw new Error(`Unexpected query in edit tests: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/blog/post/${originalBlogPost["id"]}`,
      cookies: { session: sessionCookie },
      payload: { title: updatedTitle["title"] },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const parsed = BlogPostWithBackwardsRefsSchema.parse(response.json());
    expect(parsed).toMatchObject({ title: updatedTitle["title"] });
    expect(parsed.productions).toEqual([]);
  });

  test("PATCH /api/v1/blog/post/:id — updates productions array", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "COMMIT") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("UPDATE")) {
          return Promise.resolve({ rows: [updatedTitle], rowCount: 1 });
        } else if (upper.startsWith("DELETE")) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        } else if (upper.startsWith("INSERT")) {
          return Promise.resolve({ rows: [{}], rowCount: 1 });
        } else if (upper.startsWith("SELECT PRODUCTION FROM PRODUCTION_BLOGPOST")) {
          return Promise.resolve({ rows: [{ production: 1 }, { production: 2 }, { production: 3 }], rowCount: 3 });
        }

        throw new Error(`Unexpected query in edit tests: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/blog/post/${originalBlogPost["id"]}`,
      cookies: { session: sessionCookie },
      payload: { productions: [1, 2, 3] },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    // Should have called client.query: 1 BEGIN + 1 UPDATE + 1 DELETE + 3 INSERT + 1 SELECT productions + 1 COMMIT = 8 times
    expect(mockClient.query).toHaveBeenCalledTimes(8);
  });

  test("PATCH /api/v1/blog/post/:id — leaves productions untouched when not provided", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "COMMIT") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("UPDATE")) {
          return Promise.resolve({ rows: [updatedTitle], rowCount: 1 });
        }
        if (upper.startsWith("SELECT PRODUCTION FROM PRODUCTION_BLOGPOST")) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }

        throw new Error(`Unexpected query - relations should not be touched: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/blog/post/${originalBlogPost["id"]}`,
      cookies: { session: sessionCookie },
      payload: { title: { en: "Updated Title Only" } },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    // Should have called client.query: 1 BEGIN + 1 UPDATE + 1 SELECT productions + 1 COMMIT = 4 times
    expect(mockClient.query).toHaveBeenCalledTimes(4);
  });

  test("PATCH /api/v1/blog/post/:id — rejects empty productions array", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/blog/post/${originalBlogPost["id"]}`,
      cookies: { session: sessionCookie },
      payload: { productions: [] },
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });

  test("PATCH /api/v1/blog/post/:id — updates content", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "COMMIT") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("UPDATE")) {
          return Promise.resolve({ rows: [updatedContent], rowCount: 1 });
        }
        if (upper.startsWith("SELECT PRODUCTION FROM PRODUCTION_BLOGPOST")) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }

        throw new Error(`Unexpected query in edit tests: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);

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
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "COMMIT") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("UPDATE")) {
          return Promise.resolve({ rows: [publishedPost], rowCount: 1 });
        }
        if (upper.startsWith("SELECT PRODUCTION FROM PRODUCTION_BLOGPOST")) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }

        throw new Error(`Unexpected query in edit tests: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);

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
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "COMMIT") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("UPDATE")) {
          return Promise.resolve({ rows: [draftPost], rowCount: 1 });
        }
        if (upper.startsWith("SELECT PRODUCTION FROM PRODUCTION_BLOGPOST")) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }

        throw new Error(`Unexpected query in edit tests: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/blog/post/${originalBlogPost["id"]}`,
      cookies: { session: sessionCookie },
      payload: { published_at: null },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(response.json()["published_at"]).toBeNull();
  });

  test("PATCH /api/v1/blog/post/:id — returns 500 when blogpost not found", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "ROLLBACK") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("UPDATE")) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }

        throw new Error(`Unexpected query in edit tests: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/blog/post/${originalBlogPost["id"]}`,
      cookies: { session: sessionCookie },
      payload: { title: { en: "Nonexistent post" } },
    });

    expect(response.statusCode).toBe(HttpServerError.InternalServerError);
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

  test("PATCH /api/v1/blog/post/:id — rejects invalid productions (not an array)", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/blog/post/${originalBlogPost["id"]}`,
      cookies: { session: sessionCookie },
      payload: { productions: "not-an-array" },
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

  test("PATCH /api/v1/blog/post/:id — handles transaction errors and rolls back", async () => {
    const mockClient = {
      query: vi.fn(async (query: string) => {
        const upper = query.trim().toUpperCase();
        if (upper === "BEGIN") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        // Simulate error on UPDATE
        if (upper.startsWith("UPDATE")) {
          throw new Error("Database error during update");
        }
        if (upper === "ROLLBACK") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/blog/post/${originalBlogPost["id"]}`,
      cookies: { session: sessionCookie },
      payload: { title: { en: "New title" } },
    });

    expect(response.statusCode).toBe(HttpServerError.InternalServerError);
    // Should have called: BEGIN + failed UPDATE + ROLLBACK
    expect(mockClient.query).toHaveBeenCalledTimes(3);
    // Verify ROLLBACK was called
    const rollbackCall = mockClient.query.mock.calls.find((call) =>
      call[0].toUpperCase().includes("ROLLBACK"),
    );
    expect(rollbackCall).toBeDefined();
    // Verify client was released in finally block
    expect(mockClient.release).toHaveBeenCalled();
  });
});
