import { describe, test, expect, beforeAll, beforeEach, vi, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { TagSchema, type Tag } from "@viernulvier/shared/index.js";
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

// Tag returned from UPDATE query (no productions)
const mockTagResponse = {
  id: mockTag.id,
  old_id: mockTag.old_id,
  name: mockTag.name,
  tag_type: mockTag.tag_type,
  public: mockTag.public,
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
 * Replace doesn't use transactions, just returns the updated row directly.
 */
function setupMocks(server: FastifyInstance, returnTag = mockTagResponse) {
  server.pg.query = vi.fn((query: string) => {
    const upper = query.trim().toUpperCase();

    // Handle UPDATE ... RETURNING query
    if (upper.startsWith("UPDATE TAG")) {
      return Promise.resolve({
        rows: [returnTag],
        rowCount: 1,
      });
    }

    return Promise.resolve({ rows: [], rowCount: 0 });
  });
}

describe("Replace tag", () => {
  test("PUT /api/v1/tag/:id", async () => {
    setupMocks(server);

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
    expect(result.id).toBe(mockTagResponse.id);
    expect(result.old_id).toBe(mockTagResponse.old_id);
    expect(result.name).toEqual(mockTagResponse.name);
    expect(result.tag_type).toBe(mockTagResponse.tag_type);
    expect(result.public).toBe(mockTagResponse.public);
  });

  test("PUT /api/v1/tag/:id — returns 404 when tag not found", async () => {
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

