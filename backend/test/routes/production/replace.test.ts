import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { ProductionSchemaWithBackwardsRefs, type Production } from "@viernulvier/shared/index.js";
import { HttpSuccess, HttpServerError } from "@/routes/helpers.js";
import { replaceProduction } from "@/routes/production/handlers/replace.js";
import { productionRowWithRefs } from "./fixtures.js";

vi.mock("@/plugins/authorize.js", () => import("@mocks/plugins/authorize.js"));

let server: FastifyInstance;
let sessionCookie: string;

const replacedProduction: Production = {
  id: 1,
  old_id: 1111,
  finalized: true,
  supertitle: { nl: "Nieuwe supertitel" },
  title: { nl: "Nieuwe titel" },
  artist: { nl: "Nieuwe artiest" },
  tagline: { nl: "Nieuwe tagline" },
  teaser: { nl: "Nieuwe teaser" },
  description: { nl: "Nieuwe beschrijving" },
  description_extra: { nl: "Nieuwe extra" },
  description_2: { nl: "Nieuwe beschrijving 2" },
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

describe("Replace on production route", () => {
  test("PUT /api/v1/production/:id -> replaces a production with tags and returns it", async () => {
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
        if (upper.startsWith("INSERT INTO PRODUCTION_TAG")) {
          return Promise.resolve({ rows: [], rowCount: 1 });
        }
        if (upper.startsWith("SELECT")) {
          return Promise.resolve({
            rows: [productionRowWithRefs(replacedProduction)],
            rowCount: 1,
          });
        }

        throw new Error(`Unexpected query in replace tests: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [{
        ...replacedProduction,
        tags: [1, 2, 3],
        events: [5197, 5204, 5217],
        blogposts: [1, 3],
      }],
      rowCount: 1,
    });

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/production/${replacedProduction["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        old_id: replacedProduction["old_id"],
        finalized: replacedProduction["finalized"],
        supertitle: replacedProduction["supertitle"],
        title: replacedProduction["title"],
        artist: replacedProduction["artist"],
        tagline: replacedProduction["tagline"],
        teaser: replacedProduction["teaser"],
        description: replacedProduction["description"],
        description_extra: replacedProduction["description_extra"],
        description_2: replacedProduction["description_2"],
        video_1: replacedProduction["video_1"],
        video_2: replacedProduction["video_2"],
        quote: replacedProduction["quote"],
        quote_source: replacedProduction["quote_source"],
        programme: replacedProduction["programme"],
        info: replacedProduction["info"],
        tags: [1, 2, 3],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const parsed = ProductionSchemaWithBackwardsRefs.parse(response.json());
    expect(parsed.id).toBe(replacedProduction.id);
    expect(parsed.tags).toEqual([1, 2, 3]);
    // Should have called: BEGIN + UPDATE + DELETE + 3x INSERT + COMMIT = 7 times
    expect(mockClient.query).toHaveBeenCalledTimes(7);
    expect(mockClient.release).toHaveBeenCalled();
  });

  test("PUT /api/v1/production/:id -> replaces a production without tags", async () => {
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
        if (upper.startsWith("INSERT INTO PRODUCTION_TAG")) {
          return Promise.resolve({ rows: [], rowCount: 1 });
        }
        if (upper.startsWith("SELECT")) {
          return Promise.resolve({
            rows: [productionRowWithRefs(replacedProduction)],
            rowCount: 1,
          });
        }

        throw new Error(`Unexpected query in replace tests: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [{
        ...replacedProduction,
        tags: [5],
        events: [5197, 5204, 5217],
        blogposts: [1, 3],
      }],
      rowCount: 1,
    });

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/production/${replacedProduction["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        old_id: replacedProduction["old_id"],
        finalized: replacedProduction["finalized"],
        supertitle: replacedProduction["supertitle"],
        title: replacedProduction["title"],
        artist: replacedProduction["artist"],
        tagline: replacedProduction["tagline"],
        teaser: replacedProduction["teaser"],
        description: replacedProduction["description"],
        description_extra: replacedProduction["description_extra"],
        description_2: replacedProduction["description_2"],
        video_1: replacedProduction["video_1"],
        video_2: replacedProduction["video_2"],
        quote: replacedProduction["quote"],
        quote_source: replacedProduction["quote_source"],
        programme: replacedProduction["programme"],
        info: replacedProduction["info"],
        tags: [5],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const parsed = ProductionSchemaWithBackwardsRefs.parse(response.json());
    expect(parsed.id).toBe(replacedProduction.id);
    expect(parsed.tags).toEqual([5]);
  });

  test("PUT /api/v1/production/:id -> returns 500 when production not found", async () => {
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
      url: `/api/v1/production/${replacedProduction["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        old_id: replacedProduction["old_id"],
        finalized: replacedProduction["finalized"],
        supertitle: replacedProduction["supertitle"],
        title: replacedProduction["title"],
        artist: replacedProduction["artist"],
        tagline: replacedProduction["tagline"],
        teaser: replacedProduction["teaser"],
        description: replacedProduction["description"],
        description_extra: replacedProduction["description_extra"],
        description_2: replacedProduction["description_2"],
        video_1: replacedProduction["video_1"],
        video_2: replacedProduction["video_2"],
        quote: replacedProduction["quote"],
        quote_source: replacedProduction["quote_source"],
        programme: replacedProduction["programme"],
        info: replacedProduction["info"],
        tags: [1],
      },
    });

    expect(response.statusCode).toBe(HttpServerError.InternalServerError);
  });

  test("PUT /api/v1/production/:id -> allows empty tags array", async () => {
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
        if (upper.startsWith("SELECT")) {
          return Promise.resolve({
            rows: [productionRowWithRefs(replacedProduction)],
            rowCount: 1,
          });
        }

        throw new Error(`Unexpected query in replace tests: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [{
        ...replacedProduction,
        tags: [],
        events: [5197, 5204, 5217],
        blogposts: [1, 3],
      }],
      rowCount: 1,
    });

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/production/${replacedProduction["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        old_id: replacedProduction["old_id"],
        finalized: replacedProduction["finalized"],
        supertitle: replacedProduction["supertitle"],
        title: replacedProduction["title"],
        artist: replacedProduction["artist"],
        tagline: replacedProduction["tagline"],
        teaser: replacedProduction["teaser"],
        description: replacedProduction["description"],
        description_extra: replacedProduction["description_extra"],
        description_2: replacedProduction["description_2"],
        video_1: replacedProduction["video_1"],
        video_2: replacedProduction["video_2"],
        quote: replacedProduction["quote"],
        quote_source: replacedProduction["quote_source"],
        programme: replacedProduction["programme"],
        info: replacedProduction["info"],
        tags: [],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(response.json().tags).toEqual([]);
  });

  test("replaceProduction() -> accepts empty tags array", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("BEGIN")) return Promise.resolve({ rowCount: 0 });
      if (upper.startsWith("UPDATE")) return Promise.resolve({ rows: [{ id: replacedProduction.id }], rowCount: 1 });
      if (upper.startsWith("DELETE")) return Promise.resolve({ rows: [], rowCount: 0 });
      if (upper.startsWith("INSERT INTO PRODUCTION_TAG")) return Promise.resolve({ rows: [], rowCount: 0 });
      if (upper.startsWith("COMMIT")) return Promise.resolve({ rowCount: 0 });
      if (upper.startsWith("SELECT")) {
        return Promise.resolve({
          rows: [productionRowWithRefs(replacedProduction)],
          rowCount: 1,
        });
      }

      throw new Error(`Unexpected query in replace tests: ${query}`);
    });

    server.pg.connect = vi.fn().mockResolvedValue({
      query: server.pg.query,
      release: vi.fn(),
    });

    const response = await replaceProduction(server, {
      params: { id: replacedProduction.id },
      user: { id: 1 },
      body: {
        old_id: replacedProduction.old_id,
        finalized: replacedProduction.finalized,
        supertitle: replacedProduction.supertitle,
        title: replacedProduction.title,
        artist: replacedProduction.artist,
        tagline: replacedProduction.tagline,
        teaser: replacedProduction.teaser,
        description: replacedProduction.description,
        description_extra: replacedProduction.description_extra,
        description_2: replacedProduction.description_2,
        video_1: replacedProduction.video_1,
        video_2: replacedProduction.video_2,
        quote: replacedProduction.quote,
        quote_source: replacedProduction.quote_source,
        programme: replacedProduction.programme,
        info: replacedProduction.info,
        tags: [],
      },
    } as unknown as FastifyRequest);

    expect(response).not.toBeNull();
    expect(response?.id).toBe(replacedProduction.id);
  });

  test("PUT /api/v1/production/:id -> replaces production with tags", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();
      if (upper.startsWith("BEGIN")) {
        return Promise.resolve({ rowCount: 0 });
      }

      if (upper.startsWith("COMMIT")) {
        return Promise.resolve({ rowCount: 0 });
      }

      if (upper.startsWith("ROLLBACK")) {
        return Promise.resolve({ rowCount: 0 });
      }

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [{ id: replacedProduction.id }], rowCount: 1 });
      }

      if (upper.startsWith("DELETE")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      if (upper.startsWith("INSERT INTO PRODUCTION_TAG")) {
        return Promise.resolve({ rows: [], rowCount: 2 });
      }

      if (upper.startsWith("SELECT")) {
        return Promise.resolve({
          rows: [productionRowWithRefs(replacedProduction)],
          rowCount: 1,
        });
      }

      throw new Error(`Unexpected query in replace tests: ${query}`);
    });

    server.pg.connect = vi.fn().mockResolvedValue({
      query: server.pg.query,
      release: vi.fn(),
    });

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/production/${replacedProduction["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        old_id: replacedProduction["old_id"],
        finalized: replacedProduction["finalized"],
        supertitle: replacedProduction["supertitle"],
        title: replacedProduction["title"],
        artist: replacedProduction["artist"],
        tagline: replacedProduction["tagline"],
        teaser: replacedProduction["teaser"],
        description: replacedProduction["description"],
        description_extra: replacedProduction["description_extra"],
        description_2: replacedProduction["description_2"],
        video_1: replacedProduction["video_1"],
        video_2: replacedProduction["video_2"],
        quote: replacedProduction["quote"],
        quote_source: replacedProduction["quote_source"],
        programme: replacedProduction["programme"],
        info: replacedProduction["info"],
        tags: [1, 2],
      },
    });

    expect(response.statusCode).toBe(200);
    const parsed = ProductionSchemaWithBackwardsRefs.parse(response.json());
    expect(parsed.id).toBe(replacedProduction.id);
  });
});

