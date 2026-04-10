import { describe, test, expect, beforeAll, afterAll, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import {
  ProductionSchema,
  ProductionSchemaWithBackwardsRefs,
  type ProductionWithBackwardsRefs,
} from "@viernulvier/shared/index.js";
import { getProductionsByIds } from "@/routes/production/handlers/fetch.js";
import { productionRowWithRefs, productionRowWithRefsAlt } from "./fixtures.js";

let server: FastifyInstance;
let sessionCookie: string;

const baseProduction: ProductionWithBackwardsRefs = productionRowWithRefs({
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
});

const baseProductionWithMeta = {
  ...baseProduction,
  created_at: new Date("2026-01-01T12:00:00.000Z"),
  updated_at: new Date("2026-01-02T12:00:00.000Z"),
  created_by: 1,
  updated_by: 1,
};

function mockProductionFetchPgQuery(query: string, params?: unknown[]) {
  const upper = query.trim().toUpperCase();

  if (upper.startsWith("SELECT") && upper.includes("WHERE P.ID = $1") && upper.includes("CREATED_AT")) {
    const id = Number(params?.[0]);
    if (id === baseProduction["id"]) {
      return Promise.resolve({ rows: [baseProductionWithMeta], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  }

  if (
    upper.startsWith("SELECT") &&
    upper.includes("WHERE P.ID = $1") &&
    !upper.includes("ANY($1::INT[])")
  ) {
    const id = Number(params?.[0]);
    if (id === baseProduction["id"]) {
      return Promise.resolve({ rows: [baseProduction], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  }

  if (upper.includes("COUNT(*)") && upper.includes("FROM PRODUCTION")) {
    return Promise.resolve({ rows: [{ count: 1 }], rowCount: 1 });
  }

  if (upper.includes("LIMIT") && upper.includes("OFFSET")) {
    return Promise.resolve({ rows: [baseProduction], rowCount: 1 });
  }

  if (upper.startsWith("SELECT") && upper.includes("ORDER BY P.ID ASC") && !upper.includes("LIMIT")) {
    return Promise.resolve({ rows: [baseProduction], rowCount: 1 });
  }

  throw new Error(`Unexpected query in fetch tests: ${query}`);
}

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 1, username: "Admin1" });

  server.pg.query = vi.fn().mockImplementation(mockProductionFetchPgQuery);
});

afterAll(async () => {
  await server.close();
});

describe("Production fetch routes", () => {
  test("GET /api/v1/production -> returns items and total", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/production",
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(200);

    const json = response.json() as { items: unknown[]; total: number };
    expect(json.total).toBe(1);
    const parsed = ProductionSchemaWithBackwardsRefs.array().parse(json.items);
    expect(parsed).toEqual([ProductionSchemaWithBackwardsRefs.parse(baseProduction)]);
  });

  test("GET /api/v1/production?limit=10&offset=0 -> returns a page with full total", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/production?limit=10&offset=0",
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json() as { items: unknown[]; total: number };
    expect(json.total).toBe(1);
    const parsed = ProductionSchemaWithBackwardsRefs.array().parse(json.items);
    expect(parsed).toEqual([ProductionSchemaWithBackwardsRefs.parse(baseProduction)]);
  });

  test("GET /api/v1/production?offset=0 without limit -> lists all productions (offset zero allowed)", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/production?offset=0",
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json() as { items: unknown[]; total: number };
    expect(json.total).toBe(1);
    expect(json.items).toHaveLength(1);
  });

  test("GET /api/v1/production?offset=n without limit -> 400 (offset requires limit)", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/production?offset=20",
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(400);
  });

  test("GET /api/v1/production?limit=5 -> total 0 when COUNT returns no row", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();
      if (upper.includes("COUNT(*)") && upper.includes("FROM PRODUCTION")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (upper.includes("LIMIT") && upper.includes("OFFSET")) {
        return Promise.resolve({ rows: [baseProduction], rowCount: 1 });
      }
      throw new Error(`Unexpected query in COUNT-empty test: ${query}`);
    });

    try {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/production?limit=5&offset=0",
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(200);
      const json = response.json() as { items: unknown[]; total: number };
      expect(json.total).toBe(0);
      expect(json.items).toHaveLength(1);
    } finally {
      server.pg.query = vi.fn().mockImplementation(mockProductionFetchPgQuery);
    }
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
    const { tags: _t, events: _e, ...productionCore } = baseProduction;
    const secondProduction: ProductionWithBackwardsRefs = productionRowWithRefsAlt({
      ...productionCore,
      id: 2,
      title: { nl: "Tweede titel" },
    });

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

