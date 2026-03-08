import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import productionRoutes from "@/routes/production/production.js";
import { ProductionSchema, type Production } from "@viernulvier/shared/index.js";
import { bulkEditProductions } from "@/routes/production/handlers/bulk-edit.js";

let server: FastifyInstance;

const baseProduction1: Production = {
  id: 1,
  vendor_id: 10,
  box_office_id: 20,
  events: [],
  supertitle: null,
  title: { nl: "Titel 1" },
  artist: { nl: "Artiest 1" },
  tagline: { nl: "Tagline 1" },
  teaser: { nl: "Teaser 1" },
  description: null,
  description_extra: null,
  description_2: null,
  video_1: null,
  video_2: null,
  quote: null,
  quote_source: null,
  programme: null,
  info: null,
  tags: [],
};

const baseProduction2: Production = {
  ...baseProduction1,
  id: 2,
  title: { nl: "Titel 2" },
};

const updatedBulkA1: Production = {
  ...baseProduction1,
  title: { nl: "Bulk A titel" },
  artist: { nl: "Bulk A artiest" },
};

const updatedBulkA2: Production = {
  ...baseProduction2,
  title: { nl: "Bulk A titel" },
  artist: { nl: "Bulk A artiest" },
};

const updatedBulkB1: Production = {
  ...baseProduction1,
  video_1: { nl: "Bulk B video 1" },
  info: { nl: "Bulk B info" },
};

const updatedBulkB2: Production = {
  ...baseProduction2,
  video_1: { nl: "Bulk B video 1" },
  info: { nl: "Bulk B info" },
};

const updatedBulkC1: Production = {
  ...baseProduction1,
  vendor_id: 88,
  box_office_id: 66,
  supertitle: { nl: "Bulk C supertitle" },
  title: { nl: "Bulk C titel" },
  artist: { nl: "Bulk C artiest" },
  tagline: { nl: "Bulk C tagline" },
  teaser: { nl: "Bulk C teaser" },
  description: { nl: "Bulk C description" },
  description_extra: { nl: "Bulk C description extra" },
  description_2: { nl: "Bulk C description 2" },
  video_1: { nl: "Bulk C video 1" },
  video_2: { nl: "Bulk C video 2" },
  quote: { nl: "Bulk C quote" },
  quote_source: { nl: "Bulk C quote source" },
  programme: { nl: "Bulk C programme" },
  info: { nl: "Bulk C info" },
};

const updatedBulkC2: Production = {
  ...baseProduction2,
  vendor_id: 88,
  box_office_id: 66,
  supertitle: { nl: "Bulk C supertitle" },
  title: { nl: "Bulk C titel" },
  artist: { nl: "Bulk C artiest" },
  tagline: { nl: "Bulk C tagline" },
  teaser: { nl: "Bulk C teaser" },
  description: { nl: "Bulk C description" },
  description_extra: { nl: "Bulk C description extra" },
  description_2: { nl: "Bulk C description 2" },
  video_1: { nl: "Bulk C video 1" },
  video_2: { nl: "Bulk C video 2" },
  quote: { nl: "Bulk C quote" },
  quote_source: { nl: "Bulk C quote source" },
  programme: { nl: "Bulk C programme" },
  info: { nl: "Bulk C info" },
};

beforeAll(async () => {
  server = await buildServer();
  await server.register(productionRoutes);
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("Bulk edit on production route", () => {
  test("PATCH /api/v1/production/bulk -> bulk updates core fields", async () => {
    const ids = [baseProduction1["id"], baseProduction2["id"]];

    server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        // ids are passed as last parameter
        expect(params?.[params.length - 1]).toEqual(ids);
        return Promise.resolve({ rows: [], rowCount: 2 });
      }

      if (upper.startsWith("SELECT")) {
        const id = params?.[0] as number;
        if (id === baseProduction1["id"]) {
          return Promise.resolve({ rows: [updatedBulkA1], rowCount: 1 });
        }
        if (id === baseProduction2["id"]) {
          return Promise.resolve({ rows: [updatedBulkA2], rowCount: 1 });
        }
      }

      throw new Error(`Unexpected query in bulk-edit tests A: ${query}`);
    });

    const response = await server.inject({
      method: "PATCH",
      url: "/api/v1/production/bulk",
      payload: {
        ids,
        data: {
          title: { nl: "Bulk A titel" },
          artist: { nl: "Bulk A artiest" },
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const parsed = ProductionSchema.array().parse(response.json());
    expect(parsed).toEqual([updatedBulkA1, updatedBulkA2]);
  });

  test("PATCH /api/v1/production/bulk -> bulk updates other optional fields", async () => {
    const ids = [baseProduction1["id"], baseProduction2["id"]];

    server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        expect(params?.[params.length - 1]).toEqual(ids);
        return Promise.resolve({ rows: [], rowCount: 2 });
      }

      if (upper.startsWith("SELECT")) {
        const id = params?.[0] as number;
        if (id === baseProduction1["id"]) {
          return Promise.resolve({ rows: [updatedBulkB1], rowCount: 1 });
        }
        if (id === baseProduction2["id"]) {
          return Promise.resolve({ rows: [updatedBulkB2], rowCount: 1 });
        }
      }

      throw new Error(`Unexpected query in bulk-edit tests B: ${query}`);
    });

    const response = await server.inject({
      method: "PATCH",
      url: "/api/v1/production/bulk",
      payload: {
        ids,
        data: {
          video_1: { nl: "Bulk B video 1" },
          info: { nl: "Bulk B info" },
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const parsed = ProductionSchema.array().parse(response.json());
    expect(parsed).toEqual([updatedBulkB1, updatedBulkB2]);
  });

  test("PATCH /api/v1/production/bulk -> rejects invalid body", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: "/api/v1/production/bulk",
      payload: {
        ids: [],
        data: {},
      },
    });

    expect(response.statusCode).toBe(400);
  });

  test("PATCH /api/v1/production/bulk -> supports metadata-only updates and filters missing productions", async () => {
    const ids = [baseProduction1["id"], baseProduction2["id"]];

    server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        expect(params?.[params.length - 1]).toEqual(ids);
        return Promise.resolve({ rows: [], rowCount: 2 });
      }

      if (upper.startsWith("SELECT")) {
        const id = params?.[0] as number;
        if (id === baseProduction1["id"]) {
          return Promise.resolve({ rows: [baseProduction1], rowCount: 1 });
        }
        if (id === baseProduction2["id"]) {
          // Explicitly return no rows for one id to exercise null filtering path.
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
      }

      throw new Error(`Unexpected query in bulk-edit metadata-only test: ${query}`);
    });

    const response = await server.inject({
      method: "PATCH",
      url: "/api/v1/production/bulk",
      payload: {
        ids,
        data: {},
      },
    });

    expect(response.statusCode).toBe(200);
    const parsed = ProductionSchema.array().parse(response.json());
    expect(parsed).toEqual([baseProduction1]);
  });

  test("PATCH /api/v1/production/bulk -> bulk updates all supported fields", async () => {
    const ids = [baseProduction1["id"], baseProduction2["id"]];

    server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        expect(params?.[params.length - 1]).toEqual(ids);
        return Promise.resolve({ rows: [], rowCount: 2 });
      }

      if (upper.startsWith("SELECT")) {
        const id = params?.[0] as number;
        if (id === baseProduction1["id"]) {
          return Promise.resolve({ rows: [updatedBulkC1], rowCount: 1 });
        }
        if (id === baseProduction2["id"]) {
          return Promise.resolve({ rows: [updatedBulkC2], rowCount: 1 });
        }
      }

      throw new Error(`Unexpected query in bulk-edit tests C: ${query}`);
    });

    const response = await server.inject({
      method: "PATCH",
      url: "/api/v1/production/bulk",
      payload: {
        ids,
        data: {
          vendor_id: 88,
          box_office_id: 66,
          supertitle: { nl: "Bulk C supertitle" },
          title: { nl: "Bulk C titel" },
          artist: { nl: "Bulk C artiest" },
          tagline: { nl: "Bulk C tagline" },
          teaser: { nl: "Bulk C teaser" },
          description: { nl: "Bulk C description" },
          description_extra: { nl: "Bulk C description extra" },
          description_2: { nl: "Bulk C description 2" },
          video_1: { nl: "Bulk C video 1" },
          video_2: { nl: "Bulk C video 2" },
          quote: { nl: "Bulk C quote" },
          quote_source: { nl: "Bulk C quote source" },
          programme: { nl: "Bulk C programme" },
          info: { nl: "Bulk C info" },
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const parsed = ProductionSchema.array().parse(response.json());
    expect(parsed).toEqual([updatedBulkC1, updatedBulkC2]);
  });

  test("PATCH /api/v1/production/bulk -> accepts null for nullable media/info fields", async () => {
    const ids = [baseProduction1["id"], baseProduction2["id"]];

    server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        expect(params?.[params.length - 1]).toEqual(ids);
        return Promise.resolve({ rows: [], rowCount: 2 });
      }

      if (upper.startsWith("SELECT")) {
        const id = params?.[0] as number;
        if (id === baseProduction1["id"]) {
          return Promise.resolve({ rows: [baseProduction1], rowCount: 1 });
        }
        if (id === baseProduction2["id"]) {
          return Promise.resolve({ rows: [baseProduction2], rowCount: 1 });
        }
      }

      throw new Error(`Unexpected query in bulk-edit null test: ${query}`);
    });

    const response = await server.inject({
      method: "PATCH",
      url: "/api/v1/production/bulk",
      payload: {
        ids,
        data: {
          supertitle: null,
          description: null,
          description_extra: null,
          description_2: null,
          video_1: null,
          video_2: null,
          quote: null,
          quote_source: null,
          programme: null,
          info: null,
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const parsed = ProductionSchema.array().parse(response.json());
    expect(parsed).toEqual([baseProduction1, baseProduction2]);
  });

  test("bulkEditProductions() -> ignores explicitly undefined fields", async () => {
    const ids = [baseProduction1["id"]];

    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }

      if (upper.startsWith("SELECT")) {
        return Promise.resolve({ rows: [baseProduction1], rowCount: 1 });
      }

      throw new Error(`Unexpected query in bulk-edit undefined test: ${query}`);
    });

    const result = await bulkEditProductions(server, {
      body: {
        ids,
        data: {
          vendor_id: undefined,
        },
      },
    } as any);

    expect(result).toEqual([baseProduction1]);
  });
});

