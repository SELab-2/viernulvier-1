import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { ProductionSchema, type Production } from "@viernulvier/shared/index.js";
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
  test("PUT /api/v1/production/:id -> replaces a production and returns it", async () => {
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

      if (upper.startsWith("SELECT")) {
        return Promise.resolve({
          rows: [productionRowWithRefs(replacedProduction)],
          rowCount: 1,
        });
      }

      throw new Error(`Unexpected query in replace tests: ${query}`);
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
      },
    });

    expect(response.statusCode).toBe(200);
    const parsed = ProductionSchema.parse(response.json());
    expect(parsed).toEqual(ProductionSchema.parse(replacedProduction));
  });

  test("PUT /api/v1/production/:id -> returns 404 when production not found", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [{}], rowCount: 1 });
      }

      if (upper.startsWith("SELECT")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      throw new Error(`Unexpected query in replace tests: ${query}`);
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
      },
    });

    expect(response.statusCode).toBe(404);
  });

  test("PUT /api/v1/production/:id -> rejects invalid body", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/production/${replacedProduction["id"]}`,
      cookies: { session: sessionCookie },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });
});

describe("Replace with tags", () => {
  test("PUT /api/v1/production/:id -> returns 404 when transactional update returns no row", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("BEGIN")) {
        return Promise.resolve({ rowCount: 0 });
      }

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      if (upper.startsWith("ROLLBACK")) {
        return Promise.resolve({ rowCount: 0 });
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

    expect(response.statusCode).toBe(404);
  });

  test("PUT /api/v1/production/:id -> returns 404 when transactional update returns empty rows", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("BEGIN")) {
        return Promise.resolve({ rowCount: 0 });
      }

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      if (upper.startsWith("ROLLBACK")) {
        return Promise.resolve({ rowCount: 0 });
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

    expect(response.statusCode).toBe(404);
  });

  test("PUT /api/v1/production/:id -> rolls back when tag insert fails", async () => {
    const queryMock = vi.fn();
    const releaseMock = vi.fn();
    server.pg.query = queryMock;
    server.pg.connect = vi.fn().mockResolvedValue({
      query: queryMock,
      release: releaseMock,
    });

    queryMock.mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("BEGIN")) {
        return Promise.resolve({ rowCount: 0 });
      }

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [{ id: replacedProduction.id }], rowCount: 1 });
      }

      if (upper.startsWith("DELETE")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      if (upper.startsWith("INSERT INTO PRODUCTION_TAG")) {
        return Promise.reject(new Error("Tag insert failed"));
      }

      if (upper.startsWith("ROLLBACK")) {
        return Promise.resolve({ rowCount: 0 });
      }

      throw new Error(`Unexpected query in replace tests: ${query}`);
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

    expect(response.statusCode).toBe(500);
    expect(queryMock).toHaveBeenCalledWith("ROLLBACK");
    expect(releaseMock).toHaveBeenCalled();
  });

  test("replaceProduction() -> accepts tags present but undefined", async () => {
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
      params: { id: String(replacedProduction.id) },
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
        tags: undefined,
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
        title: replacedProduction["title"],
        artist: replacedProduction["artist"],
        tagline: replacedProduction["tagline"],
        teaser: replacedProduction["teaser"],
        supertitle: replacedProduction["supertitle"],
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
    const parsed = ProductionSchema.parse(response.json());
    expect(parsed.id).toBe(replacedProduction.id);
  });
});

