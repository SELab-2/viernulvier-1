import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { BlogPostWithBackwardsRefsSchema, type BlogPost } from "@viernulvier/shared/index.js";
import { HttpSuccess, HttpClientError, HttpServerError } from "@/routes/helpers.js";

vi.mock("@/plugins/authorize.js", () => import("@mocks/plugins/authorize.js"));

let server: FastifyInstance;
let sessionCookie: string;

const mockTime = new Date();

const replacedBlogPost: BlogPost = {
  id: 1,
  blog: 1,
  title: { en: "Updated Title" },
  content: { en: "Updated content" },
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
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "COMMIT") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("UPDATE")) {
          return Promise.resolve({ rows: [replacedBlogPost], rowCount: 1 });
        } else if (upper.startsWith("DELETE")) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        } else if (upper.startsWith("INSERT")) {
          return Promise.resolve({ rows: [{}], rowCount: 1 });
        } else if (upper.startsWith("SELECT PRODUCTION FROM PRODUCTION_BLOGPOST")) {
          return Promise.resolve({ rows: [{ production: 1 }, { production: 2 }], rowCount: 2 });
        }

        throw new Error(`Unexpected query in replace tests: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);

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
    const parsed = BlogPostWithBackwardsRefsSchema.parse(response.json());
    expect(parsed).toMatchObject({ id: replacedBlogPost["id"], title: replacedBlogPost["title"] });
    expect(parsed.productions).toEqual([1, 2]);
    // Should have called client.query: 1 BEGIN + 1 UPDATE + 1 DELETE + 2 INSERT + 1 SELECT productions + 1 COMMIT = 7 times
    expect(mockClient.query).toHaveBeenCalledTimes(7);
  });

  test("PUT /api/v1/blog/post/:id — replaces a blogpost and returns it", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "COMMIT") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("UPDATE")) {
          return Promise.resolve({ rows: [replacedBlogPost], rowCount: 1 });
        } else if (upper.startsWith("DELETE")) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        } else if (upper.startsWith("INSERT")) {
          return Promise.resolve({ rows: [{}], rowCount: 1 });
        } else if (upper.startsWith("SELECT PRODUCTION FROM PRODUCTION_BLOGPOST")) {
          return Promise.resolve({ rows: [{ production: 1 }], rowCount: 1 });
        }

        throw new Error(`Unexpected query in replace tests: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);

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
    const parsed = BlogPostWithBackwardsRefsSchema.parse(response.json());
    expect(parsed).toMatchObject({ id: replacedBlogPost["id"], title: replacedBlogPost["title"] });
    expect(parsed.productions).toEqual([1]);
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
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "COMMIT") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("UPDATE")) {
          return Promise.resolve({ rows: [draft], rowCount: 1 });
        } else if (upper.startsWith("DELETE")) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        } else if (upper.startsWith("INSERT")) {
          return Promise.resolve({ rows: [{}], rowCount: 1 });
        } else if (upper.startsWith("SELECT PRODUCTION FROM PRODUCTION_BLOGPOST")) {
          return Promise.resolve({ rows: [{ production: 1 }], rowCount: 1 });
        }

        throw new Error(`Unexpected query in replace tests: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);

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

  test("PUT /api/v1/blog/post/:id — returns 500 when blogpost not found", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "ROLLBACK") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("UPDATE")) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }

        throw new Error(`Unexpected query in replace tests: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);

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

    expect(response.statusCode).toBe(HttpServerError.InternalServerError);
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
        productions: [1],
      },
    });

    expect(response.statusCode).toBe(HttpClientError.Unauthorized);
  });

  test("PUT /api/v1/blog/post/:id — handles transaction errors and rolls back", async () => {
    const mockClient = {
      query: vi.fn(async (query: string) => {
        const upper = query.trim().toUpperCase();
        if (upper === "BEGIN") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        // Simulate error on UPDATE
        if (upper.startsWith("UPDATE")) {
          throw new Error("Database error during replace");
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
      method: "PUT",
      url: `/api/v1/blog/post/${replacedBlogPost["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        blog: replacedBlogPost["blog"],
        title: { en: "New Title" },
        content: replacedBlogPost["content"],
        published_at: replacedBlogPost["published_at"],
        productions: [1],
      },
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
