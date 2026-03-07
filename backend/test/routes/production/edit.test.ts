import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import productionRoutes from "@/routes/production/production.js";
import { ProductionSchema, type Production } from "@viernulvier/shared/index.js";

let server: FastifyInstance;

const originalProduction: Production = {
  id: 1,
  vendor_id: 10,
  box_office_id: 20,
  events: [],
  supertitle: null,
  title: { nl: "Oude titel" },
  artist: { nl: "Oude artiest" },
  tagline: { nl: "Oude tagline" },
  teaser: { nl: "Oude teaser" },
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

const updatedProductionA: Production = {
  ...originalProduction,
  title: { nl: "Nieuwe titel A" },
  artist: { nl: "Nieuwe artiest A" },
  tagline: { nl: "Nieuwe tagline A" },
  teaser: { nl: "Nieuwe teaser A" },
};

const updatedProductionB: Production = {
  ...originalProduction,
  video_1: { nl: "Video 1" },
  video_2: { nl: "Video 2" },
  quote: { nl: "Quote" },
  quote_source: { nl: "Bron" },
  programme: { nl: "Programma" },
  info: { nl: "Info" },
};

const updatedProductionC: Production = {
  ...originalProduction,
  vendor_id: 99,
  box_office_id: 77,
  supertitle: { nl: "Supertitel C" },
  title: { nl: "Titel C" },
  artist: { nl: "Artiest C" },
  tagline: { nl: "Tagline C" },
  teaser: { nl: "Teaser C" },
  description: { nl: "Beschrijving C" },
  description_extra: { nl: "Extra C" },
  description_2: { nl: "Beschrijving 2 C" },
  video_1: { nl: "Video 1 C" },
  video_2: { nl: "Video 2 C" },
  quote: { nl: "Quote C" },
  quote_source: { nl: "Bron C" },
  programme: { nl: "Programma C" },
  info: { nl: "Info C" },
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

describe("Edit on production route", () => {
  test("PATCH /api/v1/production/:id -> updates a subset of fields", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }

      if (upper.startsWith("SELECT")) {
        return Promise.resolve({ rows: [updatedProductionA], rowCount: 1 });
      }

      throw new Error(`Unexpected query in edit tests: ${query}`);
    });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/production/${originalProduction['id']}`,
      payload: {
        vendor_id: originalProduction["vendor_id"],
        box_office_id: originalProduction["box_office_id"],
        supertitle: null,
        title: updatedProductionA["title"],
        artist: updatedProductionA["artist"],
        tagline: updatedProductionA["tagline"],
        teaser: updatedProductionA["teaser"],
        description: null,
        description_extra: null,
        description_2: null,
      },
    });

    expect(response.statusCode).toBe(200);
    const parsed = ProductionSchema.parse(response.json());
    expect(parsed).toEqual(updatedProductionA);
  });

  test("PATCH /api/v1/production/:id -> updates other optional fields", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }

      if (upper.startsWith("SELECT")) {
        return Promise.resolve({ rows: [updatedProductionB], rowCount: 1 });
      }

      throw new Error(`Unexpected query in edit tests: ${query}`);
    });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/production/${originalProduction['id']}`,
      payload: {
        video_1: updatedProductionB["video_1"],
        video_2: updatedProductionB["video_2"],
        quote: updatedProductionB["quote"],
        quote_source: updatedProductionB["quote_source"],
        programme: updatedProductionB["programme"],
        info: updatedProductionB["info"],
      },
    });

    expect(response.statusCode).toBe(200);
    const parsed = ProductionSchema.parse(response.json());
    expect(parsed).toEqual(updatedProductionB);
  });

  test("PATCH /api/v1/production/:id -> returns 404 when production not found", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      if (upper.startsWith("SELECT")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      throw new Error(`Unexpected query in edit tests: ${query}`);
    });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/production/${originalProduction["id"]}`,
      payload: {
        title: { nl: "Niet bestaand" },
      },
    });

    expect(response.statusCode).toBe(404);
  });

  test("PATCH /api/v1/production/:id -> updates all supported fields", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }

      if (upper.startsWith("SELECT")) {
        return Promise.resolve({ rows: [updatedProductionC], rowCount: 1 });
      }

      throw new Error(`Unexpected query in edit tests: ${query}`);
    });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/production/${originalProduction["id"]}`,
      payload: {
        vendor_id: updatedProductionC["vendor_id"],
        box_office_id: updatedProductionC["box_office_id"],
        supertitle: updatedProductionC["supertitle"],
        title: updatedProductionC["title"],
        artist: updatedProductionC["artist"],
        tagline: updatedProductionC["tagline"],
        teaser: updatedProductionC["teaser"],
        description: updatedProductionC["description"],
        description_extra: updatedProductionC["description_extra"],
        description_2: updatedProductionC["description_2"],
        video_1: updatedProductionC["video_1"],
        video_2: updatedProductionC["video_2"],
        quote: updatedProductionC["quote"],
        quote_source: updatedProductionC["quote_source"],
        programme: updatedProductionC["programme"],
        info: updatedProductionC["info"],
      },
    });

    expect(response.statusCode).toBe(200);
    const parsed = ProductionSchema.parse(response.json());
    expect(parsed).toEqual(updatedProductionC);
  });

  test("PATCH /api/v1/production/:id -> accepts null for nullable media/info fields", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }

      if (upper.startsWith("SELECT")) {
        return Promise.resolve({ rows: [originalProduction], rowCount: 1 });
      }

      throw new Error(`Unexpected query in edit tests: ${query}`);
    });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/production/${originalProduction["id"]}`,
      payload: {
        video_1: null,
        video_2: null,
        quote: null,
        quote_source: null,
        programme: null,
        info: null,
      },
    });

    expect(response.statusCode).toBe(200);
    const parsed = ProductionSchema.parse(response.json());
    expect(parsed).toEqual(originalProduction);
  });
});

