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
  productions: [10, 20],
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
 * Sets up mocks for create operations.
 * Returns the mock client and sets up the server mocks.
 */
function setupMocks(server: FastifyInstance, returnTag: Tag = mockTag, insertedId: number = 5) {
  const mockClient = {
    query: vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper === "BEGIN" || upper === "COMMIT") {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (upper.startsWith("INSERT INTO TAG")) {
        return Promise.resolve({
          rows: [
            {
              id: insertedId,
              old_id: returnTag.old_id,
              name: returnTag.name,
              tag_type: returnTag.tag_type,
              public: returnTag.public,
            },
          ],
          rowCount: 1,
        });
      }
      if (upper.startsWith("INSERT INTO PRODUCTION_TAG")) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      
      // Fallback for unexpected queries in transaction
      return Promise.resolve({ rows: [], rowCount: 0 });
    }),
    release: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  server.pg.connect = vi.fn().mockResolvedValue(mockClient);
  
  // Mock server-level queries (not in transaction) for getTagById
  server.pg.query = vi.fn((query: string) => {
    const upper = query.trim().toUpperCase();
    
    // Handle TagSelect query: SELECT id, old_id, name, tag_type, public FROM tag WHERE id = $1
    if (upper.includes("SELECT") && upper.includes("FROM TAG") && upper.includes("WHERE")) {
      return Promise.resolve({
        rows: [
          {
            id: returnTag.id,
            old_id: returnTag.old_id,
            name: returnTag.name,
            tag_type: returnTag.tag_type,
            public: returnTag.public,
          },
        ],
        rowCount: 1,
      });
    }
    
    // Handle production_tag links query
    if (upper.includes("FROM PRODUCTION_TAG") && upper.includes("WHERE TAG")) {
      return Promise.resolve({
        rows: (returnTag.productions ?? []).map((prod) => ({
          tag: returnTag.id,
          production: prod,
        })),
        rowCount: returnTag.productions?.length ?? 0,
      });
    }

    // Fallback for unexpected queries
    return Promise.resolve({ rows: [], rowCount: 0 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

  return mockClient;
}

describe("Create tag", () => {
  test("POST /api/v1/tag", async () => {
    setupMocks(server);

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/tag",
      cookies: { session: sessionCookie },
      payload: {
        old_id: mockTag.old_id,
        name: mockTag.name,
        tag_type: mockTag.tag_type,
        public: mockTag.public,
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(TagSchema.parse(response.json())).toEqual(mockTag);
  });

  test("POST /api/v1/tag with productions", async () => {
    setupMocks(server, mockTagWithProductions);

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/tag",
      cookies: { session: sessionCookie },
      payload: {
        old_id: mockTagWithProductions.old_id,
        name: mockTagWithProductions.name,
        tag_type: mockTagWithProductions.tag_type,
        public: mockTagWithProductions.public,
        productions: [10, 20],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const result = TagSchema.parse(response.json());
    expect(result.productions).toEqual([10, 20]);
  });

  test("POST /api/v1/tag — returns 404 when insert returns no row", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "COMMIT" || upper === "ROLLBACK") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("INSERT INTO TAG")) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }

        return Promise.resolve({ rows: [], rowCount: 0 });
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [],
      rowCount: 0,
    });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/tag",
      cookies: { session: sessionCookie },
      payload: {
        old_id: mockTag.old_id,
        name: mockTag.name,
        tag_type: mockTag.tag_type,
        public: mockTag.public,
      },
    });

    expect(response.statusCode).toBe(HttpClientError.NotFound);
  });

  test("POST /api/v1/tag — handles error during transaction", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("INSERT INTO TAG")) {
          return Promise.resolve({
            rows: [{ id: 5, old_id: null, name: { nl: "Test" }, tag_type: 1, public: true }],
            rowCount: 1,
          });
        }
        // Simulate error on production_tag insert
        if (upper.startsWith("INSERT INTO PRODUCTION_TAG")) {
          return Promise.reject(new Error("Database error"));
        }
        if (upper === "ROLLBACK") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }

        return Promise.resolve({ rows: [], rowCount: 0 });
      }),
      release: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/tag",
      cookies: { session: sessionCookie },
      payload: {
        old_id: mockTag.old_id,
        name: mockTag.name,
        tag_type: mockTag.tag_type,
        public: mockTag.public,
        productions: [1, 2, 3],
      },
    });

    expect(response.statusCode).toBe(HttpServerError.InternalServerError);
  });

  test("POST /api/v1/tag invalid body", async () => {
    const response = await server.inject({
      method: "POST",
      cookies: { session: sessionCookie },
      url: "/api/v1/tag",
      payload: {},
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });

  test("POST /api/v1/tag — rolls back transaction on error", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("INSERT INTO PRODUCTION_TAG")) {
          throw new Error("Production insertion failed");
        }

        throw new Error(`Unexpected query: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/tag",
      cookies: { session: sessionCookie },
      payload: {
        old_id: mockTag.old_id,
        name: mockTag.name,
        tag_type: mockTag.tag_type,
        public: mockTag.public,
        productions: [10],
      },
    });

    expect(response.statusCode).toBe(HttpServerError.InternalServerError);
    expect(mockClient.release).toHaveBeenCalled();
  });
});
