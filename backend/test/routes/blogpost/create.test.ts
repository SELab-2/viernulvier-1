import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { BlogPostSchema, type BlogPost } from "@viernulvier/shared/index.js";
import { HttpSuccess, HttpClientError, HttpServerError } from "@/routes/helpers.js";

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
    // Create a proper mock for the client returned by connect()
    const mockClient = {
      query: vi.fn(async (query: string) => {
        const upper = query.trim().toUpperCase();
        
        if (upper === "BEGIN" || upper === "COMMIT" || upper === "ROLLBACK") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("INSERT INTO BLOGPOST") && upper.includes("RETURNING")) {
          return Promise.resolve({ rows: [mockBlogPost], rowCount: 1 });
        }
        if (upper.startsWith("INSERT INTO PRODUCTION_BLOGPOST")) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        // Fallback - return empty
        return Promise.resolve({ rows: [], rowCount: 0 });
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);

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
    // Verify transaction flow: BEGIN + INSERT blogpost + 3x INSERT production_blogpost + COMMIT
    expect(mockClient.query).toHaveBeenCalledTimes(6);
    expect(mockClient.release).toHaveBeenCalled();
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
    const mockClient = {
      query: vi.fn(async (query: string) => {
        const upper = query.trim().toUpperCase();
        if (upper === "BEGIN" || upper === "COMMIT" || upper === "ROLLBACK") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("INSERT INTO BLOGPOST") && upper.includes("RETURNING")) {
          return Promise.resolve({ rows: [mockDraftBlogPost], rowCount: 1 });
        }
        if (upper.startsWith("INSERT INTO PRODUCTION_BLOGPOST")) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);

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
    // Should have called client.query: 1 BEGIN + 1 INSERT blogpost + 1 INSERT production_blogpost + 1 COMMIT
    expect(mockClient.query).toHaveBeenCalledTimes(4);
    expect(mockClient.release).toHaveBeenCalled();
  });

  test("POST /api/v1/blog/post — returns 404 when insert returns no row", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();
        if (upper === "BEGIN" || upper === "ROLLBACK") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("INSERT INTO blogpost")) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        console.error(`Unexpected query: ${query}`);
        return Promise.resolve({ rows: [], rowCount: 0 });
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);

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

  test("POST /api/v1/blog/post — handles transaction errors and rolls back", async () => {
    const mockClient = {
      query: vi.fn(async (query: string) => {
        const upper = query.trim().toUpperCase();
        if (upper === "BEGIN") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        // Simulate error on INSERT blogpost
        if (upper.startsWith("INSERT INTO BLOGPOST")) {
          throw new Error("Database error");
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
      method: "POST",
      url: "/api/v1/blog/post",
      cookies: { session: sessionCookie },
      payload: {
        blog: mockBlogPost["blog"],
        title: mockBlogPost["title"],
        content: mockBlogPost["content"],
        published_at: mockBlogPost["published_at"],
        productions: [1],
      },
    });

    expect(response.statusCode).toBe(HttpServerError.InternalServerError);
    // Should have called: BEGIN + failed INSERT blogpost + ROLLBACK
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
