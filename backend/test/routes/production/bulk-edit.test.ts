import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { ProductionSchema, type Production } from "@viernulvier/shared/index.js";
import { bulkEditProductions } from "@/routes/production/handlers/bulk-edit.js";
import { productionRowWithRefs, productionRowWithRefsAlt } from "./fixtures.js";
import { HttpSuccess } from "@/routes/helpers.js";

vi.mock("@/plugins/authorize.js", () => import("@mocks/plugins/authorize.js"));

let server: FastifyInstance;
let sessionCookie: string;

const baseProduction1: Production = {
  id: 1,
  old_id: 1111,
  finalized: true,
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
  sessionCookie = server.jwt.sign({ id: 1, username: "Admin1" });
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

    const mockClient = {
      query: vi.fn().mockImplementation((query: string, params?: unknown[]) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "COMMIT") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("UPDATE")) {
          return Promise.resolve({ rows: [], rowCount: 2 });
        }
        if (upper.startsWith("SELECT")) {
          return Promise.resolve({
            rows: [
              productionRowWithRefs(updatedBulkA1),
              productionRowWithRefsAlt(updatedBulkA2),
            ],
            rowCount: 2,
          });
        }

        throw new Error(`Unexpected query in bulk-edit tests A: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [
        productionRowWithRefs(updatedBulkA1),
        productionRowWithRefsAlt(updatedBulkA2),
      ],
      rowCount: 2,
    });

    const response = await server.inject({
      method: "PATCH",
      url: "/api/v1/production/bulk",
      cookies: { session: sessionCookie },
      payload: {
        ids,
        data: {
          title: { nl: "Bulk A titel" },
          artist: { nl: "Bulk A artiest" },
        },
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const parsed = ProductionSchema.array().parse(response.json());
    expect(parsed).toEqual([
      ProductionSchema.parse(updatedBulkA1),
      ProductionSchema.parse(updatedBulkA2),
    ]);
  });

  test("PATCH /api/v1/production/bulk -> bulk updates with tags", async () => {
    const ids = [baseProduction1["id"], baseProduction2["id"]];

    const mockClient = {
      query: vi.fn().mockImplementation((query: string, params?: unknown[]) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "COMMIT") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("UPDATE")) {
          return Promise.resolve({ rows: [], rowCount: 2 });
        }
        if (upper.startsWith("DELETE")) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("INSERT INTO PRODUCTION_TAG")) {
          return Promise.resolve({ rows: [], rowCount: 1 });
        }
        if (upper.startsWith("SELECT")) {
          return Promise.resolve({
            rows: [
              productionRowWithRefs(updatedBulkA1),
              productionRowWithRefsAlt(updatedBulkA2),
            ],
            rowCount: 2,
          });
        }

        throw new Error(`Unexpected query in bulk-edit tags test: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [
        productionRowWithRefs(updatedBulkA1),
        productionRowWithRefsAlt(updatedBulkA2),
      ],
      rowCount: 2,
    });

    const response = await server.inject({
      method: "PATCH",
      url: "/api/v1/production/bulk",
      cookies: { session: sessionCookie },
      payload: {
        ids,
        data: {
          tags: [1, 2],
        },
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    // Should have: BEGIN + DELETE + 4x INSERT (2 productions * 2 tags) + COMMIT = 7 times
    expect(mockClient.query).toHaveBeenCalledTimes(7);
    expect(mockClient.release).toHaveBeenCalled();
  });

  test("PATCH /api/v1/production/bulk -> bulk updates other optional fields", async () => {
    const ids = [baseProduction1["id"], baseProduction2["id"]];

    const mockClient = {
      query: vi.fn().mockImplementation((query: string, params?: unknown[]) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "COMMIT") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("UPDATE")) {
          return Promise.resolve({ rows: [], rowCount: 2 });
        }
        if (upper.startsWith("SELECT")) {
          return Promise.resolve({
            rows: [
              productionRowWithRefs(updatedBulkB1),
              productionRowWithRefsAlt(updatedBulkB2),
            ],
            rowCount: 2,
          });
        }

        throw new Error(`Unexpected query in bulk-edit tests B: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [
        productionRowWithRefs(updatedBulkB1),
        productionRowWithRefsAlt(updatedBulkB2),
      ],
      rowCount: 2,
    });

    const response = await server.inject({
      method: "PATCH",
      url: "/api/v1/production/bulk",
      cookies: { session: sessionCookie },
      payload: {
        ids,
        data: {
          video_1: { nl: "Bulk B video 1" },
          info: { nl: "Bulk B info" },
        },
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const parsed = ProductionSchema.array().parse(response.json());
    expect(parsed).toEqual([
      ProductionSchema.parse(updatedBulkB1),
      ProductionSchema.parse(updatedBulkB2),
    ]);
  });

  test("PATCH /api/v1/production/bulk -> rejects invalid body", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: "/api/v1/production/bulk",
      cookies: { session: sessionCookie },
      payload: {
        ids: [],
        data: {},
      },
    });

    expect(response.statusCode).toBe(400);
  });

  test("PATCH /api/v1/production/bulk -> rejects empty data body", async () => {
    const ids = [baseProduction1["id"], baseProduction2["id"]];

    const response = await server.inject({
      method: "PATCH",
      url: "/api/v1/production/bulk",
      cookies: { session: sessionCookie },
      payload: {
        ids,
        data: {},
      },
    });

    expect(response.statusCode).toBe(400);
  });

  test("PATCH /api/v1/production/bulk -> bulk updates all supported fields", async () => {
    const ids = [baseProduction1["id"], baseProduction2["id"]];

    const mockClient = {
      query: vi.fn().mockImplementation((query: string, params?: unknown[]) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "COMMIT") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("UPDATE")) {
          return Promise.resolve({ rows: [], rowCount: 2 });
        }
        if (upper.startsWith("SELECT")) {
          return Promise.resolve({
            rows: [
              productionRowWithRefs(updatedBulkC1),
              productionRowWithRefsAlt(updatedBulkC2),
            ],
            rowCount: 2,
          });
        }

        throw new Error(`Unexpected query in bulk-edit tests C: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [
        productionRowWithRefs(updatedBulkC1),
        productionRowWithRefsAlt(updatedBulkC2),
      ],
      rowCount: 2,
    });

    const response = await server.inject({
      method: "PATCH",
      url: "/api/v1/production/bulk",
      cookies: { session: sessionCookie },
      payload: {
        ids,
        data: {
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

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const parsed = ProductionSchema.array().parse(response.json());
    expect(parsed).toEqual([
      ProductionSchema.parse(updatedBulkC1),
      ProductionSchema.parse(updatedBulkC2),
    ]);
  });

  test("PATCH /api/v1/production/bulk -> accepts null for nullable media/info fields", async () => {
    const ids = [baseProduction1["id"], baseProduction2["id"]];

    const mockClient = {
      query: vi.fn().mockImplementation((query: string, params?: unknown[]) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "COMMIT") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("UPDATE")) {
          return Promise.resolve({ rows: [], rowCount: 2 });
        }
        if (upper.startsWith("SELECT")) {
          return Promise.resolve({
            rows: [
              productionRowWithRefs(baseProduction1),
              productionRowWithRefsAlt(baseProduction2),
            ],
            rowCount: 2,
          });
        }

        throw new Error(`Unexpected query in bulk-edit null test: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [
        productionRowWithRefs(baseProduction1),
        productionRowWithRefsAlt(baseProduction2),
      ],
      rowCount: 2,
    });

    const response = await server.inject({
      method: "PATCH",
      url: "/api/v1/production/bulk",
      cookies: { session: sessionCookie },
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

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const parsed = ProductionSchema.array().parse(response.json());
    expect(parsed).toEqual([
      ProductionSchema.parse(baseProduction1),
      ProductionSchema.parse(baseProduction2),
    ]);
  });

  test("bulkEditProductions() -> rejects explicitly undefined fields", async () => {
    const ids = [baseProduction1["id"]];
    const mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);

    await expect(
      bulkEditProductions(server, {
        user: { id: 1 },
        body: {
          ids,
          data: {
            title: undefined,
          },
        },
      } as unknown as FastifyRequest),
    ).rejects.toMatchObject({ status: 400 });
  });
});

