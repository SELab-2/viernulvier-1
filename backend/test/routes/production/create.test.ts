import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { ProductionSchema, type Production } from "@viernulvier/shared/index.js";
import { productionRowWithRefs } from "./fixtures.js";

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
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("INSERT")) {
        // Return all RETURNING fields from the INSERT statement
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

    expect(response.statusCode).toBe(200);
    const parsed = ProductionSchema.parse(response.json());
    expect(parsed).toEqual(ProductionSchema.parse(createdProduction));
  });

  test("POST /api/v1/production -> returns 404 when insert returns no row", async () => {
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
});

describe("Create with tags", () => {
  const createdProduction: Production = {
    id: 1,
    old_id: null,
    finalized: false,
    supertitle: null,
    title: { nl: "Production with tags" },
    artist: { nl: "Artist" },
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

  test("POST /api/v1/production -> creates production with tags", async () => {
    const queryMock = vi.fn();
    server.pg.query = queryMock;
    server.pg.connect = vi.fn().mockResolvedValue({
      query: queryMock,
      release: vi.fn(),
    });

    queryMock.mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();
      if (upper.startsWith("BEGIN")) return Promise.resolve({ rowCount: 0 });
      if (upper.startsWith("INSERT INTO PRODUCTION_TAG")) return Promise.resolve({ rowCount: 2 });
      if (upper.startsWith("INSERT INTO PRODUCTION ")) return Promise.resolve({
        rows: [{
          id: createdProduction.id,
          old_id: createdProduction.old_id,
          finalized: createdProduction.finalized,
          supertitle: null,
          title: createdProduction.title,
          artist: createdProduction.artist,
          tagline: createdProduction.tagline,
          teaser: createdProduction.teaser,
          description: null,
          description_extra: null,
          description_2: null,
          video_1: null,
          video_2: null,
          quote: null,
          quote_source: null,
          programme: null,
          info: null,
        }],
        rowCount: 1,
      });
      if (upper.startsWith("COMMIT")) return Promise.resolve({ rowCount: 0 });
      if (upper.startsWith("SELECT")) return Promise.resolve({
        rows: [productionRowWithRefs(createdProduction)],
        rowCount: 1,
      });
      throw new Error(`Unexpected query: ${query}`);
    });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/production",
      cookies: { session: sessionCookie },
      payload: {
        title: createdProduction.title,
        artist: createdProduction.artist,
        tagline: createdProduction.tagline,
        teaser: createdProduction.teaser,
        tags: [1, 2],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(queryMock).toHaveBeenCalledWith("BEGIN");
    expect(queryMock).toHaveBeenCalledWith("COMMIT");
  });

  test("POST /api/v1/production -> returns 404 when transactional insert returns no row", async () => {
    const queryMock = vi.fn();
    server.pg.query = queryMock;
    server.pg.connect = vi.fn().mockResolvedValue({
      query: queryMock,
      release: vi.fn(),
    });

    queryMock.mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("BEGIN")) return Promise.resolve({ rowCount: 0 });
      if (upper.startsWith("INSERT INTO PRODUCTION ")) return Promise.resolve({ rows: [], rowCount: 0 });
      if (upper.startsWith("ROLLBACK")) return Promise.resolve({ rowCount: 0 });

      throw new Error(`Unexpected query: ${query}`);
    });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/production",
      cookies: { session: sessionCookie },
      payload: {
        title: createdProduction.title,
        artist: createdProduction.artist,
        tagline: createdProduction.tagline,
        teaser: createdProduction.teaser,
        tags: [1, 2],
      },
    });

    expect(response.statusCode).toBe(404);
    expect(queryMock).toHaveBeenCalledWith("ROLLBACK");
  });

  test("POST /api/v1/production -> rolls back on tag insert failure", async () => {
    const queryMock = vi.fn();
    const releaseMock = vi.fn();
    server.pg.query = queryMock;
    server.pg.connect = vi.fn().mockResolvedValue({
      query: queryMock,
      release: releaseMock,
    });

    queryMock.mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();
      if (upper.startsWith("BEGIN")) return Promise.resolve({ rowCount: 0 });
      if (upper.startsWith("INSERT INTO PRODUCTION_TAG")) return Promise.reject(new Error("Tag insert failed"));
      if (upper.startsWith("INSERT INTO PRODUCTION ")) return Promise.resolve({
        rows: [{ id: 1 }],
        rowCount: 1,
      });
      if (upper.startsWith("ROLLBACK")) return Promise.resolve({ rowCount: 0 });
      throw new Error(`Unexpected query: ${query}`);
    });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/production",
      cookies: { session: sessionCookie },
      payload: {
        title: createdProduction.title,
        artist: createdProduction.artist,
        tagline: createdProduction.tagline,
        teaser: createdProduction.teaser,
        tags: [1, 2],
      },
    });

    expect(response.statusCode).toBe(500);
    expect(queryMock).toHaveBeenCalledWith("ROLLBACK");
    expect(releaseMock).toHaveBeenCalled();
  });

  test("POST /api/v1/production -> creates production without tags", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();
      if (upper.startsWith("INSERT")) {
        return Promise.resolve({
          rows: [{
            id: createdProduction.id,
            old_id: createdProduction.old_id,
            finalized: createdProduction.finalized,
            supertitle: null,
            title: createdProduction.title,
            artist: createdProduction.artist,
            tagline: createdProduction.tagline,
            teaser: createdProduction.teaser,
            description: null,
            description_extra: null,
            description_2: null,
            video_1: null,
            video_2: null,
            quote: null,
            quote_source: null,
            programme: null,
            info: null,
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
        title: createdProduction.title,
        artist: createdProduction.artist,
        tagline: createdProduction.tagline,
        teaser: createdProduction.teaser,
      },
    });

    expect(response.statusCode).toBe(200);
  });
});

