import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { ProductionSchema, type Production } from "@viernulvier/shared/index.js";

let server: FastifyInstance;
let sessionCookie: string;

const createdProduction: Production = {
  id: 1,
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
        return Promise.resolve({ rows: [{ id: createdProduction["id"] }], rowCount: 1 });
      }

      if (upper.startsWith("SELECT")) {
        return Promise.resolve({ rows: [createdProduction], rowCount: 1 });
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

