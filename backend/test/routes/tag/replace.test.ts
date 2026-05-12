import { describe, test, expect, beforeAll, beforeEach, vi, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import type { Tag } from "@viernulvier/shared/index.js";
import { HttpSuccess, HttpClientError } from "@/routes/helpers.js";

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
 * Sets up mocks for replace operations.
 * Replace now uses transactions to handle tag updates and production_tag management.
 */
function setupMocks(server: FastifyInstance, returnTag: Tag = mockTag, productionIds: number[] = []) {
  const mockClient = {
    query: vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper === "BEGIN" || upper === "COMMIT") {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (upper.startsWith("UPDATE TAG")) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      if (upper.startsWith("DELETE FROM PRODUCTION_TAG")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (upper.startsWith("INSERT INTO PRODUCTION_TAG")) {
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
        rows: [{ ...returnTag, productions: productionIds }],
        rowCount: 1,
      });
    }
    if (upper.includes("FROM PRODUCTION_TAG")) {
      return Promise.resolve({
        rows: productionIds.map((prod) => ({
          tag: returnTag.id,
          production: prod,
        })),
        rowCount: productionIds.length,
      });
    }

    throw new Error(`Unexpected query in server-level query: ${query}`);
  });
}

describe("Replace tag", () => {
  test("PUT /api/v1/tag/:id", async () => {
    setupMocks(server, mockTag);

    const response = await server.inject({
      method: "PUT",
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
    const result = response.json();
    expect(result?.id).toBe(mockTag.id);
    expect(result?.old_id).toBe(mockTag.old_id);
    expect(result?.name).toEqual(mockTag.name);
    expect(result?.tag_type).toBe(mockTag.tag_type);
    expect(result?.public).toBe(mockTag.public);
  });

  test("PUT /api/v1/tag/:id — replaces tag with production links", async () => {
    const productionIds = [1, 2, 3];
    const tagWithProductions: Tag = { ...mockTag, productions: productionIds };
    setupMocks(server, tagWithProductions, productionIds);

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/tag/${mockTag.id}`,
      cookies: { session: sessionCookie },
      payload: {
        old_id: mockTag.old_id,
        name: mockTag.name,
        tag_type: mockTag.tag_type,
        public: mockTag.public,
        productions: productionIds,
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const result = response.json();
    expect(result?.id).toBe(mockTag.id);
    expect(result?.productions).toEqual(productionIds);
  });

  test("PUT /api/v1/tag/:id — returns 404 when tag not found", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "COMMIT" || upper === "ROLLBACK") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("UPDATE TAG")) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("DELETE FROM PRODUCTION_TAG")) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }

        throw new Error(`Unexpected query in replace tests: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [],
      rowCount: 0,
    });

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/tag/${mockTag.id}`,
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

  test("PUT /api/v1/tag/:id — rejects invalid body", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/tag/${mockTag.id}`,
      cookies: { session: sessionCookie },
      payload: {
        name: mockTag.name,
        tag_type: mockTag.tag_type,
      },
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });
});

