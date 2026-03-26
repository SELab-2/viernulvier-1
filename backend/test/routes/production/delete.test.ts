import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { ProductionSchema, type Production } from "@viernulvier/shared/index.js";

let server: FastifyInstance;
let sessionCookie: string;

const mockProduction: Production = {
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

describe("Delete on production route", () => {
  test("DELETE /api/v1/production/:id -> deletes a production and returns it", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("SELECT")) {
        return Promise.resolve({
          rows: [{ ...mockProduction, tags: [], events: [] }],
          rowCount: 1,
        });
      }

      if (upper.startsWith("DELETE")) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }

      throw new Error(`Unexpected query in delete tests: ${query}`);
    });

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/production/${mockProduction["id"]}`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(200);
    const parsed = ProductionSchema.parse(response.json());
    expect(parsed).toEqual(ProductionSchema.parse(mockProduction));
  });

  test("DELETE /api/v1/production/:id -> returns 404 when production not found", async () => {
    server.pg.query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/production/${mockProduction["id"]}`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(404);
  });
});

