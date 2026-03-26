import { describe, test, expect, beforeAll, afterAll, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import {
  ProductionSchema,
  ProductionSchemaWithBackwardsRefs,
  type ProductionWithBackwardsRefs,
} from "@viernulvier/shared/index.js";
import { getProductionsByIds } from "@/routes/production/handlers/fetch.js";

let server: FastifyInstance;
let sessionCookie: string;

const baseProduction: ProductionWithBackwardsRefs = {
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
  events: [],
  tags: [],
};

const baseProductionWithMeta = {
  ...baseProduction,
  created_at: new Date("2026-01-01T12:00:00.000Z"),
  updated_at: new Date("2026-01-02T12:00:00.000Z"),
  created_by: 1,
  updated_by: 1,
};

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 1, username: "Admin1" });

  server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
    const upper = query.trim().toUpperCase();

    if (upper.startsWith("SELECT") && upper.includes("WHERE P.ID = $1") && upper.includes("CREATED_AT")) {
      const id = Number(params?.[0]);
      if (id === baseProduction["id"]) {
        return Promise.resolve({ rows: [baseProductionWithMeta], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    }

    if (upper.startsWith("SELECT") && upper.includes("WHERE P.ID = $1")) {
      const id = Number(params?.[0]);
      if (id === baseProduction["id"]) {
        return Promise.resolve({ rows: [baseProduction], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    }

    if (upper.startsWith("SELECT")) {
      return Promise.resolve({ rows: [baseProduction], rowCount: 1 });
    }

    throw new Error(`Unexpected query in fetch tests: ${query}`);
  });
});

afterAll(async () => {
  await server.close();
});

describe("Production fetch routes", () => {
  test("GET /api/v1/production -> returns a list of productions", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/production",
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(200);

    const json = response.json();
    const parsed = ProductionSchemaWithBackwardsRefs.array().parse(json);
    expect(parsed).toEqual([ProductionSchemaWithBackwardsRefs.parse(baseProduction)]);
  });

  test("GET /api/v1/production/:id -> returns a single production", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/production/${baseProduction["id"]}`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(200);
    const parsed = ProductionSchemaWithBackwardsRefs.parse(response.json());
    expect(parsed).toEqual(ProductionSchemaWithBackwardsRefs.parse(baseProduction));
  });

  test("GET /api/v1/production/:id -> returns 404 for unknown id", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/production/9999",
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(404);
  });

  test("GET /api/v1/production/:id/meta -> returns a single production with metadata", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/production/${baseProduction["id"]}/meta`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(200);
    const parsed = ProductionSchema.withMeta().parse(response.json());
    expect(parsed).toEqual(ProductionSchema.withMeta().parse(baseProductionWithMeta));
  });

  test("GET /api/v1/production/:id/meta -> returns 404 for unknown id", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/production/9999/meta",
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe("Production fetch helpers", () => {
  test("getProductionsByIds -> returns empty array for empty ids", async () => {
    const querySpy = vi.spyOn(server.pg, "query");
    querySpy.mockClear();

    const result = await getProductionsByIds(server, []);

    expect(result).toEqual([]);
    expect(querySpy).not.toHaveBeenCalled();
    querySpy.mockRestore();
  });

  test("getProductionsByIds -> fetches with ANY(ids) in one query", async () => {
    const ids = [2, 1];
    const secondProduction: ProductionWithBackwardsRefs = {
      ...baseProduction,
      id: 2,
      title: { nl: "Tweede titel" },
    };

    server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("SELECT") && upper.includes("WHERE P.ID = ANY($1::INT[])")) {
        expect(params?.[0]).toEqual(ids);
        return Promise.resolve({ rows: [secondProduction, baseProduction], rowCount: 2 });
      }

      throw new Error(`Unexpected query in getProductionsByIds test: ${query}`);
    });

    const result = await getProductionsByIds(server, ids);

    expect(result).toEqual([
      ProductionSchemaWithBackwardsRefs.parse(secondProduction),
      ProductionSchemaWithBackwardsRefs.parse(baseProduction),
    ]);
  });
});

