import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { ProductionSchema, type Production } from "@viernulvier/shared/index.js";
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

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [], rowCount: 1 });
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
        return Promise.resolve({ rows: [], rowCount: 0 });
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
      payload: {
      },
    });

    expect(response.statusCode).toBe(400);
  });
});

