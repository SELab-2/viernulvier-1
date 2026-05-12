import { describe, test, expect, beforeAll, beforeEach, vi, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { TagSchema, type Tag } from "@viernulvier/shared/index.js";
import { HttpSuccess, HttpClientError, HttpServerError } from "@/routes/helpers.js";

vi.mock("@/plugins/authorize.js", () => import("@mocks/plugins/authorize.js"));

let server: FastifyInstance;
let sessionCookie: string;

const mockTag: Tag = {
  id: 5,
  old_id: 111,
  name: { en: "Music", nl: "Muziek" },
  tag_type: 1,
  productions: [],
  public: true,
};

const mockTagWithProductions: Tag = {
  ...mockTag,
  productions: [10, 20, 30],
};

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 1, username: "Admin" });

  server.addHook("preHandler", (request, _, done) => {
    if (!request.user) {
      request.user = { id: 1 };
    }
    done();
  });
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.restoreAllMocks();
});

/**
 * Sets up mocks for both the connection (transaction) and server-level query.
 * Returns the mock client and sets up the server mocks.
 */
function setupMocks(server: FastifyInstance, returnTag: Tag = mockTag) {
  const mockClient = {
    query: vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper === "BEGIN" || upper === "COMMIT") {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      if (upper.startsWith("DELETE")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (upper.startsWith("INSERT")) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }

      throw new Error(`Unexpected query in transaction: ${query}`);
    }),
    release: vi.fn(),
  };

  server.pg.connect = vi.fn().mockResolvedValue(mockClient);
  server.pg.query = vi.fn().mockImplementation((query: string) => {
    const upper = query.trim().toUpperCase();

    if (upper.includes("FROM TAG") && upper.includes("WHERE ID")) {
      return Promise.resolve({
        rows: [returnTag],
        rowCount: 1,
      });
    }
    if (upper.includes("FROM PRODUCTION_TAG")) {
      return Promise.resolve({
        rows: (returnTag.productions ?? []).map((prod) => ({
          tag: returnTag.id,
          production: prod,
        })),
        rowCount: returnTag.productions?.length ?? 0,
      });
    }

    throw new Error(`Unexpected query in server-level query: ${query}`);
  });

  return mockClient;
}

describe("Edit tag", () => {
  test("PATCH /api/v1/tag/:id old_id only", async () => {
    setupMocks(server);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/tag/${mockTag.id}`,
      cookies: { session: sessionCookie },
      payload: { old_id: mockTag.old_id },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(TagSchema.parse(response.json())).toEqual(mockTag);
  });

  test("PATCH /api/v1/tag/:id name only", async () => {
    setupMocks(server);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/tag/${mockTag.id}`,
      cookies: { session: sessionCookie },
      payload: { name: mockTag.name },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(TagSchema.parse(response.json())).toEqual(mockTag);
  });

  test("PATCH /api/v1/tag/:id tag_type only", async () => {
    setupMocks(server);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/tag/${mockTag.id}`,
      cookies: { session: sessionCookie },
      payload: { tag_type: mockTag.tag_type },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
  });

  test("PATCH /api/v1/tag/:id public only", async () => {
    setupMocks(server);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/tag/${mockTag.id}`,
      cookies: { session: sessionCookie },
      payload: { public: mockTag.public },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
  });

  test("PATCH /api/v1/tag/:id all fields", async () => {
    setupMocks(server);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/tag/${mockTag.id}`,
      cookies: { session: sessionCookie },
      payload: {
        old_id: mockTag.old_id,
        name: mockTag.name,
        tag_type: mockTag.tag_type,
        public: mockTag.public,
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
  });

  test("PATCH /api/v1/tag/:id with productions only", async () => {
    setupMocks(server, mockTagWithProductions);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/tag/${mockTag.id}`,
      cookies: { session: sessionCookie },
      payload: { productions: [10, 20, 30] },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const result = TagSchema.parse(response.json());
    expect(result.productions).toEqual([10, 20, 30]);
  });

  test("PATCH /api/v1/tag/:id with field and productions update", async () => {
    setupMocks(server, mockTagWithProductions);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/tag/${mockTag.id}`,
      cookies: { session: sessionCookie },
      payload: {
        name: { en: "Updated", nl: "Bijgewerkt" },
        productions: [10, 20, 30],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const result = TagSchema.parse(response.json());
    expect(result.productions).toEqual([10, 20, 30]);
  });

  test("PATCH /api/v1/tag/:id with no fields (empty payload)", async () => {
    setupMocks(server);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/tag/${mockTag.id}`,
      cookies: { session: sessionCookie },
      payload: {},
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(TagSchema.parse(response.json())).toEqual(mockTag);
  });

  test("PATCH /api/v1/tag/:id — returns 404 when tag not found", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "COMMIT") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("UPDATE")) {
          return Promise.resolve({ rows: [], rowCount: 1 });
        }

        throw new Error(`Unexpected query: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [],
      rowCount: 0,
    });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/tag/${mockTag.id}`,
      cookies: { session: sessionCookie },
      payload: { name: mockTag.name },
    });

    expect(response.statusCode).toBe(HttpClientError.NotFound);
  });

  test("PATCH /api/v1/tag/:id — rolls back transaction on error", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("DELETE")) {
          throw new Error("Delete operation failed");
        }
        if (upper === "ROLLBACK") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }

        throw new Error(`Unexpected query: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/tag/${mockTag.id}`,
      cookies: { session: sessionCookie },
      payload: { productions: [10, 20] },
    });

    expect(response.statusCode).toBe(HttpServerError.InternalServerError);
    expect(mockClient.release).toHaveBeenCalled();
  });
});
