import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { ProductionSchemaWithBackwardsRefs, type Production } from "@viernulvier/shared/index.js";
import { editProduction } from "@/routes/production/handlers/edit.js";
import { productionRowWithRefs } from "./fixtures.js";
import { HttpSuccess } from "@/routes/helpers.js";

vi.mock("@/plugins/authorize.js", () => import("@mocks/plugins/authorize.js"));

let server: FastifyInstance;
let sessionCookie: string;

const originalProduction: Production = {
  id: 1,
  old_id: 1111,
  finalized: true,
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
  sessionCookie = server.jwt.sign({ id: 1, username: "Admin1" });
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("Edit on production route", () => {
  test("PATCH /api/v1/production/:id -> updates a subset of fields", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "COMMIT") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("UPDATE")) {
          return Promise.resolve({ rows: [], rowCount: 1 });
        }
        if (upper.startsWith("SELECT")) {
          return Promise.resolve({
            rows: [productionRowWithRefs(updatedProductionA)],
            rowCount: 1,
          });
        }

        throw new Error(`Unexpected query in edit tests: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [productionRowWithRefs(updatedProductionA)],
      rowCount: 1,
    });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/production/${originalProduction['id']}`,
      cookies: { session: sessionCookie },
      payload: {
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

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const parsed = ProductionSchemaWithBackwardsRefs.parse(response.json());
    expect(parsed.id).toBe(updatedProductionA.id);
    expect(parsed.title).toEqual(updatedProductionA.title);
    expect(parsed.artist).toEqual(updatedProductionA.artist);
    expect(parsed.tagline).toEqual(updatedProductionA.tagline);
    expect(parsed.teaser).toEqual(updatedProductionA.teaser);
  });

  test("PATCH /api/v1/production/:id -> updates tags", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "COMMIT") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("UPDATE")) {
          return Promise.resolve({ rows: [], rowCount: 1 });
        }
        if (upper.startsWith("DELETE")) {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("INSERT INTO PRODUCTION_TAG")) {
          return Promise.resolve({ rows: [], rowCount: 1 });
        }
        if (upper.startsWith("SELECT")) {
          return Promise.resolve({
            rows: [{ tag: 1 }, { tag: 2 }, { tag: 3 }],
            rowCount: 3,
          });
        }

        throw new Error(`Unexpected query in edit tests: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [{
        ...originalProduction,
        tags: [1, 2, 3],
        events: [5197, 5204, 5217],
        blogposts: [1, 3],
      }],
      rowCount: 1,
    });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/production/${originalProduction['id']}`,
      cookies: { session: sessionCookie },
      payload: {
        tags: [1, 2, 3],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const parsed = ProductionSchemaWithBackwardsRefs.parse(response.json());
    expect(parsed.tags).toEqual([1, 2, 3]);
    // Should verify transaction flow: BEGIN + DELETE + 3x INSERT + COMMIT = 6 times
    expect(mockClient.query).toHaveBeenCalledTimes(6);
  });

  test("PATCH /api/v1/production/:id -> updates other optional fields", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "COMMIT") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("UPDATE")) {
          return Promise.resolve({ rows: [], rowCount: 1 });
        }
        if (upper.startsWith("SELECT")) {
          return Promise.resolve({
            rows: [productionRowWithRefs(updatedProductionB)],
            rowCount: 1,
          });
        }

        throw new Error(`Unexpected query in edit tests: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [productionRowWithRefs(updatedProductionB)],
      rowCount: 1,
    });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/production/${originalProduction['id']}`,
      cookies: { session: sessionCookie },
      payload: {
        video_1: updatedProductionB["video_1"],
        video_2: updatedProductionB["video_2"],
        quote: updatedProductionB["quote"],
        quote_source: updatedProductionB["quote_source"],
        programme: updatedProductionB["programme"],
        info: updatedProductionB["info"],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const parsed = ProductionSchemaWithBackwardsRefs.parse(response.json());
    expect(parsed.video_1).toEqual(updatedProductionB.video_1);
    expect(parsed.video_2).toEqual(updatedProductionB.video_2);
    expect(parsed.quote).toEqual(updatedProductionB.quote);
    expect(parsed.info).toEqual(updatedProductionB.info);
  });

  test("PATCH /api/v1/production/:id -> updates all supported fields", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "COMMIT") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("UPDATE")) {
          return Promise.resolve({ rows: [], rowCount: 1 });
        }
        if (upper.startsWith("SELECT")) {
          return Promise.resolve({
            rows: [productionRowWithRefs(updatedProductionC)],
            rowCount: 1,
          });
        }

        throw new Error(`Unexpected query in edit tests: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [productionRowWithRefs(updatedProductionC)],
      rowCount: 1,
    });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/production/${originalProduction["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
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

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const parsed = ProductionSchemaWithBackwardsRefs.parse(response.json());
    expect(parsed.id).toBe(updatedProductionC.id);
    expect(parsed.title).toEqual(updatedProductionC.title);
    expect(parsed.artist).toEqual(updatedProductionC.artist);
  });

  test("PATCH /api/v1/production/:id -> accepts null for nullable media/info fields", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN" || upper === "COMMIT") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("UPDATE")) {
          return Promise.resolve({ rows: [], rowCount: 1 });
        }
        if (upper.startsWith("SELECT")) {
          return Promise.resolve({
            rows: [productionRowWithRefs(originalProduction)],
            rowCount: 1,
          });
        }

        throw new Error(`Unexpected query in edit tests: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [productionRowWithRefs(originalProduction)],
      rowCount: 1,
    });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/production/${originalProduction["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        video_1: null,
        video_2: null,
        quote: null,
        quote_source: null,
        programme: null,
        info: null,
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const parsed = ProductionSchemaWithBackwardsRefs.parse(response.json());
    expect(parsed.video_1).toBeNull();
    expect(parsed.video_2).toBeNull();
    expect(parsed.quote).toBeNull();
    expect(parsed.info).toBeNull();
  });

  test("PATCH /api/v1/production/:id -> rejects empty body", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/production/${originalProduction["id"]}`,
      cookies: { session: sessionCookie },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  test("editProduction() -> rejects body with only undefined fields", async () => {
    const mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);

    await expect(editProduction(server, {
      params: { id: originalProduction["id"] },
      user: { id: 1 },
      body: { title: undefined },
    } as unknown as FastifyRequest)).rejects.toMatchObject({ status: 400 });
  });

  test("editProduction() -> handles error during transaction", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((query: string) => {
        const upper = query.trim().toUpperCase();

        if (upper === "BEGIN") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        if (upper.startsWith("UPDATE PRODUCTION")) {
          return Promise.reject(new Error("Update failed"));
        }
        if (upper === "ROLLBACK") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }

        throw new Error(`Unexpected query: ${query}`);
      }),
      release: vi.fn(),
    };

    server.pg.connect = vi.fn().mockResolvedValue(mockClient);

    await expect(editProduction(server, {
      params: { id: originalProduction["id"] },
      user: { id: 1 },
      body: { title: { nl: "New Title" } },
    } as unknown as FastifyRequest)).rejects.toMatchObject({ status: 500 });

    expect(mockClient.release).toHaveBeenCalled();
  });
});

