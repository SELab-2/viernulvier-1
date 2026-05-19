import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { ProductionSchemaWithBackwardsRefs, type Production } from "@viernulvier/shared/index.js";
import { HttpSuccess } from "@/routes/helpers.js";

vi.mock("@/plugins/authorize.js", () => import("@mocks/plugins/authorize.js"));

let server: FastifyInstance;
let sessionCookie: string;

const createdProduction: Production = {
  id: 1,
  old_id: 1111,
  finalized: true,
  supertitle: null,
  title: { nl: "Titel" },
  artist: { nl: "Artiest" },
  tagline: { nl: "Tagline" },
  teaser: { nl: "Teaser" },
  description: null,
  description_extra: null,
  description_2: null,
  video_1: null,
  video_2: null,
  quote: null,
  quote_source: null,
  programme: null,
  info: null,
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

describe("Create on production route", () => {
  test("POST /api/v1/production -> creates a production and returns it", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "COMMIT") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("INSERT INTO PRODUCTION") && upper.includes("RETURNING")) {
          return Promise.resolve({
            rows: [
              {
                id: createdProduction.id,
                old_id: createdProduction.old_id,
                finalized: createdProduction.finalized,
                supertitle: createdProduction.supertitle,
                title: createdProduction.title,
                artist: createdProduction.artist,
                tagline: createdProduction.tagline,
                teaser: createdProduction.teaser,
                description: createdProduction.description,
                description_extra: createdProduction.description_extra,
                description_2: createdProduction.description_2,
                video_1: createdProduction.video_1,
                video_2: createdProduction.video_2,
                quote: createdProduction.quote,
                quote_source: createdProduction.quote_source,
                programme: createdProduction.programme,
                info: createdProduction.info,
              },
            ],
            rowCount: 1,
          });
        }
        if (upper.startsWith("SELECT")) {
          // Fetch tags - return empty array since no tags were provided
          return Promise.resolve({ rows: [], rowCount: 0 });
        }

        throw new Error(`Unexpected query in create tests: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);
    // Also mock server.pg.query for the final getProductionById call
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();
      if (upper.startsWith("SELECT")) {
        return Promise.resolve({
          rows: [{
            ...createdProduction,
            tags: [],
            events: [5197, 5204, 5217],
            blogposts: [1, 3],
          }],
          rowCount: 1,
        });
      }
      throw new Error(`Unexpected query in create tests: ${query}`);
    });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/production",
      cookies: { session: sessionCookie },
      payload: {
        title: createdProduction["title"],
        artist: createdProduction["artist"],
        tagline: createdProduction["tagline"],
        teaser: createdProduction["teaser"],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const parsed = ProductionSchemaWithBackwardsRefs.parse(response.json());
    expect(parsed.id).toBe(createdProduction.id);
    expect(parsed.title).toEqual(createdProduction.title);
    expect(parsed.artist).toEqual(createdProduction.artist);
    expect(parsed.tags).toEqual([]);
    expect(mockClient.release).toHaveBeenCalled();
  });

  test("POST /api/v1/production -> creates a production with tags", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "COMMIT") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("INSERT INTO PRODUCTION") && upper.includes("RETURNING")) {
          return Promise.resolve({
            rows: [
              {
                id: createdProduction.id,
                old_id: createdProduction.old_id,
                finalized: createdProduction.finalized,
                supertitle: createdProduction.supertitle,
                title: createdProduction.title,
                artist: createdProduction.artist,
                tagline: createdProduction.tagline,
                teaser: createdProduction.teaser,
                description: createdProduction.description,
                description_extra: createdProduction.description_extra,
                description_2: createdProduction.description_2,
                video_1: createdProduction.video_1,
                video_2: createdProduction.video_2,
                quote: createdProduction.quote,
                quote_source: createdProduction.quote_source,
                programme: createdProduction.programme,
                info: createdProduction.info,
              },
            ],
            rowCount: 1,
          });
        }
        if (upper.startsWith("INSERT INTO PRODUCTION_TAG")) {
          return Promise.resolve({ rows: [], rowCount: 1 });
        }
        if (upper.startsWith("SELECT")) {
          // Fetch tags - return the tags that were inserted
          return Promise.resolve({
            rows: [{ tag: 1 }, { tag: 2 }, { tag: 3 }],
            rowCount: 3,
          });
        }

        throw new Error(`Unexpected query in create tests: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);
    // Also mock server.pg.query for the final getProductionById call
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();
      if (upper.startsWith("SELECT")) {
        return Promise.resolve({
          rows: [{
            ...createdProduction,
            tags: [1, 2, 3],
            events: [5197, 5204, 5217],
            blogposts: [1, 3],
          }],
          rowCount: 1,
        });
      }
      throw new Error(`Unexpected query in create tests: ${query}`);
    });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/production",
      cookies: { session: sessionCookie },
      payload: {
        title: createdProduction["title"],
        artist: createdProduction["artist"],
        tagline: createdProduction["tagline"],
        teaser: createdProduction["teaser"],
        tags: [1, 2, 3],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const parsed = ProductionSchemaWithBackwardsRefs.parse(response.json());
    expect(parsed.id).toBe(createdProduction.id);
    expect(parsed.tags).toEqual([1, 2, 3]);
    // Uses one UNNEST insert for tags: BEGIN + INSERT production + INSERT production_tag + COMMIT.
    expect(mockClient.query).toHaveBeenCalledTimes(4);
    expect(mockClient.release).toHaveBeenCalled();
  });

  test("POST /api/v1/production -> rejects invalid body", async () => {
    // No title -> Zod validation should fail.
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/production",
      cookies: { session: sessionCookie },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  test("POST /api/v1/production -> handles error during transaction", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("INSERT INTO PRODUCTION")) {
          return Promise.reject(new Error("Production insert failed"));
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
      method: "POST",
      url: "/api/v1/production",
      cookies: { session: sessionCookie },
      payload: {
        title: createdProduction["title"],
        artist: createdProduction["artist"],
        tagline: createdProduction["tagline"],
        teaser: createdProduction["teaser"],
        tags: [1, 2],
      },
    });

    expect(response.statusCode).toBe(500);
    expect(mockClient.release).toHaveBeenCalled();
  });

  test("POST /api/v1/production -> handles INSERT returning no rows", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("INSERT INTO PRODUCTION")) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper === "ROLLBACK") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper === "COMMIT") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }

        throw new Error(`Unexpected query: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);
    server.pg.query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/production",
      cookies: { session: sessionCookie },
      payload: {
        title: createdProduction["title"],
        artist: createdProduction["artist"],
        tagline: createdProduction["tagline"],
        teaser: createdProduction["teaser"],
        tags: [1, 2],
      },
    });

    expect(response.statusCode).toBe(404);
    expect(mockClient.release).toHaveBeenCalled();
  });

  test("POST /api/v1/production -> creates production without tags (non-transaction path)", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "COMMIT") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("INSERT INTO PRODUCTION") && upper.includes("RETURNING")) {
          return Promise.resolve({
            rows: [
              {
                id: createdProduction.id,
                old_id: createdProduction.old_id,
                finalized: createdProduction.finalized,
                supertitle: createdProduction.supertitle,
                title: createdProduction.title,
                artist: createdProduction.artist,
                tagline: createdProduction.tagline,
                teaser: createdProduction.teaser,
                description: createdProduction.description,
                description_extra: createdProduction.description_extra,
                description_2: createdProduction.description_2,
                video_1: createdProduction.video_1,
                video_2: createdProduction.video_2,
                quote: createdProduction.quote,
                quote_source: createdProduction.quote_source,
                programme: createdProduction.programme,
                info: createdProduction.info,
              },
            ],
            rowCount: 1,
          });
        }
        if (upper.startsWith("SELECT")) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }

        throw new Error(`Unexpected query in non-transaction test: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();
      if (upper.startsWith("SELECT")) {
        return Promise.resolve({
          rows: [{
            ...createdProduction,
            tags: [],
            events: [],
            blogposts: [],
          }],
          rowCount: 1,
        });
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/production",
      cookies: { session: sessionCookie },
      payload: {
        title: createdProduction["title"],
        artist: createdProduction["artist"],
        tagline: createdProduction["tagline"],
        teaser: createdProduction["teaser"],
        tags: [],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const parsed = ProductionSchemaWithBackwardsRefs.parse(response.json());
    expect(parsed.id).toBe(createdProduction.id);
    expect(parsed.tags).toEqual([]);
    expect(mockClient.release).toHaveBeenCalled();
  });

  test("POST /api/v1/production -> handles error during tag insertion in non-transaction path", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("INSERT INTO PRODUCTION") && upper.includes("RETURNING")) {
          return Promise.resolve({
            rows: [{ id: createdProduction.id }],
            rowCount: 1,
          });
        }
        if (upper.startsWith("INSERT INTO PRODUCTION_TAG")) {
          return Promise.reject(new Error("Tag insert failed"));
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
      method: "POST",
      url: "/api/v1/production",
      cookies: { session: sessionCookie },
      payload: {
        title: createdProduction["title"],
        artist: createdProduction["artist"],
        tagline: createdProduction["tagline"],
        teaser: createdProduction["teaser"],
      },
    });

    expect(response.statusCode).toBe(500);
    expect(mockClient.release).toHaveBeenCalled();
  });

  test("POST /api/v1/production -> handles INSERT returning no rows in non-transaction path", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("INSERT INTO PRODUCTION")) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper === "ROLLBACK") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }

        throw new Error(`Unexpected query: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);
    server.pg.query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/production",
      cookies: { session: sessionCookie },
      payload: {
        title: createdProduction["title"],
        artist: createdProduction["artist"],
        tagline: createdProduction["tagline"],
        teaser: createdProduction["teaser"],
      },
    });

    expect(response.statusCode).toBe(404);
    expect(mockClient.release).toHaveBeenCalled();
  });
});

