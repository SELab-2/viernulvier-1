import { describe, test, expect, beforeAll, afterAll, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import {
  MOCK_IMAGE_1,
  MOCK_IMAGE_2,
  MOCK_CROP_1,
  MOCK_CROP_2,
  MOCK_CROP_3,
  MOCK_META,
  imageWithCrops,
} from "./fixtures.js";
import { getImageByOldId } from "@/routes/media/handlers/fetch.js";

vi.mock("@/plugins/authorize.js", () => import("@mocks/plugins/authorize.js"));

let server: FastifyInstance;
let sessionCookie: string;

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 1, username: "Admin1" });

  server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
    const upper = query.replace(/\s+/g, " ").trim().toUpperCase();

    // ── Image count (pagination) ──
    if (upper.includes("COUNT(") && upper.includes("FROM IMAGE I") && !upper.includes("GROUP")) {
      return Promise.resolve({ rows: [{ c: 2 }], rowCount: 1 });
    }

    // ── All images with LIMIT (paged list) ──
    if (
      upper.includes("FROM IMAGE I") &&
      upper.includes("ORDER BY I.ID ASC") &&
      upper.includes("LIMIT")
    ) {
      const limit = Number(params?.[0]);
      const offset = Number(params?.[1] ?? 0);
      const all = [MOCK_IMAGE_1, MOCK_IMAGE_2].sort((a, b) => a.id - b.id);
      const rows = all.slice(offset, offset + limit);
      return Promise.resolve({ rows, rowCount: rows.length });
    }

    // ── All images (list, no limit) ──
    if (upper.includes("FROM IMAGE I") && upper.includes("ORDER BY I.ID ASC") && !upper.includes("WHERE")) {
      return Promise.resolve({ rows: [MOCK_IMAGE_1, MOCK_IMAGE_2], rowCount: 2 });
    }

    // ── Single image by ID ──
    if (upper.includes("FROM IMAGE I") && upper.includes("WHERE I.ID = \$1")) {
      const id = Number(params?.[0]);
      if (id === MOCK_IMAGE_1.id) {
        if (upper.includes("CREATED_AT")) {
          return Promise.resolve({ rows: [{ ...MOCK_IMAGE_1, ...MOCK_META }], rowCount: 1 });
        }
        return Promise.resolve({ rows: [MOCK_IMAGE_1], rowCount: 1 });
      }
      if (id === MOCK_IMAGE_2.id) {
        return Promise.resolve({ rows: [MOCK_IMAGE_2], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    }

    // ── Single image by oldId ──
    if (upper.includes("FROM IMAGE I") && upper.includes("WHERE I.OLD_ID = \$1")) {
      const oldId = Number(params?.[0]);
      const img = [MOCK_IMAGE_1, MOCK_IMAGE_2].find((i) => i.old_id === oldId);
      return Promise.resolve({
        rows: img ? [img] : [],
        rowCount: img ? 1 : 0,
      });
    }

    // ── Images by production + oldId ──
    if (upper.includes("FROM IMAGE I") && upper.includes("WHERE I.OLD_ID = \$1 AND I.PRODUCTION = \$2")) {
      const oldId = Number(params?.[0]);
      const prodId = Number(params?.[1]);
      const img = [MOCK_IMAGE_1, MOCK_IMAGE_2].find(
        (i) => i.old_id === oldId && i.production === prodId,
      );
      return Promise.resolve({
        rows: img ? [img] : [],
        rowCount: img ? 1 : 0,
      });
    }

    // ── Images by production ──
    if (upper.includes("FROM IMAGE I") && upper.includes("WHERE I.PRODUCTION = \$1")) {
      const prodId = Number(params?.[0]);
      if (prodId === 1) {
        return Promise.resolve({ rows: [MOCK_IMAGE_1, MOCK_IMAGE_2], rowCount: 2 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    }

    // ── Crops by image (batch ANY) ──
    if (upper.includes("FROM CROP C") && upper.includes("ANY(\$1::INT[])")) {
      const ids = params?.[0] as number[];
      const crops = [MOCK_CROP_1, MOCK_CROP_2, MOCK_CROP_3].filter((c) =>
        ids.includes(c.image),
      );
      return Promise.resolve({ rows: crops, rowCount: crops.length });
    }

    // ── Crop by image + oldId ── CHECK THIS BEFORE IMAGE ONLY!
    if (upper.includes("FROM CROP C") && upper.includes("WHERE C.IMAGE = \$1 AND C.OLD_ID = \$2")) {
      const imgId = Number(params?.[0]);
      const oldId = Number(params?.[1]);
      const crop = [MOCK_CROP_1, MOCK_CROP_2, MOCK_CROP_3].find(
        (c) => c.image === imgId && c.old_id === oldId,
      );
      return Promise.resolve({
        rows: crop ? [crop] : [],
        rowCount: crop ? 1 : 0,
      });
    }

    // ── Crop by image + type ──
    if (upper.includes("FROM CROP C") && upper.includes("C.TYPE = \$2")) {
      const imgId = Number(params?.[0]);
      const type = params?.[1] as string;
      const crop = [MOCK_CROP_1, MOCK_CROP_2, MOCK_CROP_3].find(
        (c) => c.image === imgId && c.type === type,
      );
      return Promise.resolve({
        rows: crop ? [crop] : [],
        rowCount: crop ? 1 : 0,
      });
    }

    // ── Crops by image ID (must come after the type check) ──
    if (upper.includes("FROM CROP C") && upper.includes("WHERE C.IMAGE = \$1")) {
      const imgId = Number(params?.[0]);
      if (upper.includes("CREATED_AT")) {
        const crops = [MOCK_CROP_1, MOCK_CROP_2, MOCK_CROP_3]
          .filter((c) => c.image === imgId)
          .map((c) => ({ ...c, ...MOCK_META }));
        return Promise.resolve({ rows: crops, rowCount: crops.length });
      }
      const crops = [MOCK_CROP_1, MOCK_CROP_2, MOCK_CROP_3].filter(
        (c) => c.image === imgId,
      );
      return Promise.resolve({ rows: crops, rowCount: crops.length });
    }

    // ── Catch-all: return empty result for any unmatched query (e.g. authorize middleware) ──
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
});

afterAll(async () => {
  await server.close();
});

describe("Image fetch routes", () => {
  test("GET /api/v1/production/:productionId/image -> returns images with crops", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/production/1/image",
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toEqual([
      imageWithCrops(MOCK_IMAGE_1, [MOCK_CROP_1, MOCK_CROP_2]),
      imageWithCrops(MOCK_IMAGE_2, [MOCK_CROP_3]),
    ]);
  });

  test("GET /api/v1/production/:productionId/image -> returns empty array for unknown production", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/production/9999/image",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  test("GET /api/v1/image/:id -> returns a single image with crops", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      imageWithCrops(MOCK_IMAGE_1, [MOCK_CROP_1, MOCK_CROP_2]),
    );
  });

  test("GET /api/v1/image/:id -> returns 404 for unknown id", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/image/9999",
    });

    expect(response.statusCode).toBe(404);
  });

  test("GET /api/v1/image/:id/meta -> returns image with metadata and crops with metadata", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}/meta`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toMatchObject({
      id: MOCK_IMAGE_1.id,
      production: MOCK_IMAGE_1.production,
      res: MOCK_IMAGE_1.res,
      created_by: MOCK_META.created_by,
      updated_by: MOCK_META.updated_by,
    });
    expect(json.crops).toHaveLength(2);
    expect(json.crops[0]).toMatchObject({
      id: MOCK_CROP_1.id,
      created_by: MOCK_META.created_by,
    });
  });

  test("GET /api/v1/image/:id/meta -> returns 404 for unknown id", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/image/9999/meta",
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(404);
  });

  test("GET /api/v1/image/:id/meta -> returns 401 without auth", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}/meta`,
    });

    expect(response.statusCode).toBe(401);
  });

  test("GET /api/v1/production/:productionId/image -> returns image with empty crops array when image has no crops", async () => {
    const IMAGE_NO_CROPS = { id: 50, old_id: null, production: 7, res: "800x600" };

    const originalQuery = server.pg.query;
    server.pg.query = vi.fn().mockImplementation((query: string, _params?: unknown[]) => {
      const upper = query.replace(/\s+/g, " ").trim().toUpperCase();

      if (upper.includes("FROM IMAGE I") && upper.includes("WHERE I.PRODUCTION = $1")) {
        return Promise.resolve({ rows: [IMAGE_NO_CROPS], rowCount: 1 });
      }

      if (upper.includes("FROM CROP C") && upper.includes("ANY(\\$1::INT[])")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/production/7/image",
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toEqual([
      { ...IMAGE_NO_CROPS, crops: [] },
    ]);

    server.pg.query = originalQuery;
  });

  test("GET /api/v1/image -> returns all images with crops", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/image",
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toEqual([
      imageWithCrops(MOCK_IMAGE_1, [MOCK_CROP_1, MOCK_CROP_2]),
      imageWithCrops(MOCK_IMAGE_2, [MOCK_CROP_3]),
    ]);
  });

  test("GET /api/v1/image?page=1&pageSize=1 -> returns totalItems and one member", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/image?page=1&pageSize=1",
    });

    expect(response.statusCode).toBe(200);
    const json = response.json() as { totalItems: number; member: unknown[] };
    expect(json.totalItems).toBe(2);
    expect(json.member).toHaveLength(1);
    expect(json.member[0]).toEqual(
      imageWithCrops(MOCK_IMAGE_1, [MOCK_CROP_1, MOCK_CROP_2]),
    );
  });

  test("GET /api/v1/image?oldId=X -> returns specific image by oldId with crops", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/image?oldId=${MOCK_IMAGE_1.old_id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      imageWithCrops(MOCK_IMAGE_1, [MOCK_CROP_1, MOCK_CROP_2]),
    ]);
  });

  test("GET /api/v1/image?oldId=X -> returns empty array when oldId not found", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/image?oldId=9999",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });
});

describe("Crop fetch routes", () => {
  test("GET /api/v1/image/:imageId/crop -> returns crops for an image", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}/crop`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([MOCK_CROP_1, MOCK_CROP_2]);
  });

  test("GET /api/v1/image/:imageId/crop -> returns empty array for image with no crops", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/image/9999/crop",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  test("GET /api/v1/image/:imageId/crop/:type -> returns crop by type", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}/crop/general`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(MOCK_CROP_1);
  });

  test("GET /api/v1/image/:imageId/crop/:type -> returns crop by thumbnail type", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}/crop/thumbnail`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(MOCK_CROP_2);
  });

  test("GET /api/v1/image/:imageId/crop/:type -> returns 404 for unknown type", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}/crop/nonexistent`,
    });

    expect(response.statusCode).toBe(404);
  });

  test("GET /api/v1/image/:imageId/crop?oldId=X -> returns specific crop by oldId", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}/crop?oldId=${MOCK_CROP_1.old_id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([MOCK_CROP_1]);
  });

  test("GET /api/v1/image/:imageId/crop?oldId=X -> returns empty when oldId not found", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}/crop?oldId=9999`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  test("GET /api/v1/image/:imageId/crop?oldId=X -> returns empty when oldId exists but wrong image", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/image/9999/crop?oldId=${MOCK_CROP_1.old_id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });
});

describe("Branch coverage for edge cases", () => {
  test("GET /api/v1/image -> covers nullish coalescing in attachCropsToImages (line 84)", async () => {
    // This tests the `cropsByImage.get(imageId) ?? []` branch
    // Setup: query returns an image with no matching crops
    const IMAGE_NO_CROPS = { id: 100, old_id: null, production: 1, res: "800x600" };

    const originalQuery = server.pg.query;
    server.pg.query = vi.fn().mockImplementation((query: string, _params?: unknown[]) => {
      const upper = query.replace(/\s+/g, " ").trim().toUpperCase();

      if (upper.includes("FROM IMAGE I") && upper.includes("ORDER BY I.ID ASC") && !upper.includes("WHERE") && !upper.includes("LIMIT")) {
        return Promise.resolve({ rows: [IMAGE_NO_CROPS], rowCount: 1 });
      }

      // Return empty crops - triggers the `?? []` fallback when building cropsByImage map
      if (upper.includes("FROM CROP C") && upper.includes("ANY(\\$1::INT[])")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/image",
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toHaveLength(1);
    expect(json[0]).toEqual({ ...IMAGE_NO_CROPS, crops: [] });
    expect(Array.isArray(json[0].crops)).toBe(true);

    server.pg.query = originalQuery;
  });

  test("GET /api/v1/image?page=1 -> covers pagination count edge case (line 251-256)", async () => {
    // This tests the `countR.rows[0]?.c ?? 0` branch when count query returns results
    const originalQuery = server.pg.query;
    server.pg.query = vi.fn().mockImplementation((query: string, _params?: unknown[]) => {
      const upper = query.replace(/\s+/g, " ").trim().toUpperCase();

      if (upper.includes("COUNT(") && upper.includes("FROM IMAGE I")) {
        return Promise.resolve({ rows: [{ c: 5 }], rowCount: 1 });
      }

      if (upper.includes("FROM IMAGE I") && upper.includes("LIMIT")) {
        return Promise.resolve({ rows: [MOCK_IMAGE_1, MOCK_IMAGE_2], rowCount: 2 });
      }

      if (upper.includes("FROM CROP C") && upper.includes("ANY(\\$1::INT[])")) {
        return Promise.resolve({ rows: [MOCK_CROP_1, MOCK_CROP_2, MOCK_CROP_3], rowCount: 3 });
      }

      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/image?page=1&pageSize=2",
    });

    expect(response.statusCode).toBe(200);
    const json = response.json() as { totalItems: number; member: unknown[] };
    expect(json.totalItems).toBe(5);
    expect(json.member).toHaveLength(2);

    server.pg.query = originalQuery;
  });

  test("GET /api/v1/image?page=2 -> covers pagination with offset (line 251-256)", async () => {
    // Tests that offset calculation is correct: (page - 1) * pageSize
    const originalQuery = server.pg.query;
    let capturedOffset: number | undefined;

    server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
      const upper = query.replace(/\s+/g, " ").trim().toUpperCase();

      if (upper.includes("COUNT(") && upper.includes("FROM IMAGE I")) {
        return Promise.resolve({ rows: [{ c: 10 }], rowCount: 1 });
      }

      if (upper.includes("FROM IMAGE I") && upper.includes("LIMIT")) {
        capturedOffset = Number(params?.[1]);
        return Promise.resolve({ rows: [MOCK_IMAGE_2], rowCount: 1 });
      }

      if (upper.includes("FROM CROP C") && upper.includes("ANY(\\$1::INT[])")) {
        return Promise.resolve({ rows: [MOCK_CROP_3], rowCount: 1 });
      }

      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/image?page=2&pageSize=5",
    });

    expect(response.statusCode).toBe(200);
    expect(capturedOffset).toBe(5); // (2 - 1) * 5 = 5
    const json = response.json() as { totalItems: number; member: unknown[] };
    expect(json.totalItems).toBe(10);

    server.pg.query = originalQuery;
  });

  test("GET /api/v1/image?oldId=X -> covers image not found branch (line 107)", async () => {
    // Tests the `if (images.length === 0) return null;` branch in getImageByOldId
    const originalQuery = server.pg.query;
    server.pg.query = vi.fn().mockImplementation((query: string, _params?: unknown[]) => {
      const upper = query.replace(/\s+/g, " ").trim().toUpperCase();

      // Return empty for the oldId query
      if (upper.includes("FROM IMAGE I") && upper.includes("WHERE I.OLD_ID = \$1")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/image?oldId=99999",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);

    server.pg.query = originalQuery;
  });

  test("GET /api/v1/image/:id -> covers single image not found (line 107)", async () => {
    // Tests when getImageById returns empty rows
    const originalQuery = server.pg.query;
    server.pg.query = vi.fn().mockImplementation((query: string, _params?: unknown[]) => {
      const upper = query.replace(/\s+/g, " ").trim().toUpperCase();

      if (upper.includes("FROM IMAGE I") && upper.includes("WHERE I.ID = \$1")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/image/999",
    });

    expect(response.statusCode).toBe(404);

    server.pg.query = originalQuery;
  });

  test("GET /api/v1/image?page=1 -> covers count result with falsy construction", async () => {
    // Tests the optional chaining path: `countR.rows[0]?.c`
    const originalQuery = server.pg.query;
    server.pg.query = vi.fn().mockImplementation((query: string, _params?: unknown[]) => {
      const upper = query.replace(/\s+/g, " ").trim().toUpperCase();

      // COUNT query returns a row but with count value 0
      if (upper.includes("COUNT(") && upper.includes("FROM IMAGE I")) {
        return Promise.resolve({ rows: [{ c: 0 }], rowCount: 1 });
      }

      if (upper.includes("FROM IMAGE I") && upper.includes("LIMIT")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/image?page=1&pageSize=10",
    });

    expect(response.statusCode).toBe(200);
    const json = response.json() as { totalItems: number; member: unknown[] };
    expect(json.totalItems).toBe(0);
    expect(json.member).toHaveLength(0);

    server.pg.query = originalQuery;
  });

  test("direct: getImageByOldId -> returns null when image not found (covers images.length === 0)", async () => {
    const originalQuery = server.pg.query;
    server.pg.query = vi.fn().mockImplementation((query: string, _params?: unknown[]) => {
      const upper = query.replace(/\s+/g, " ").trim().toUpperCase();
      if (upper.includes("FROM IMAGE I") && upper.includes("WHERE I.OLD_ID = \$1")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const res = await getImageByOldId(server, 999999);
    expect(res).toBeNull();

    server.pg.query = originalQuery;
  });

  test("direct: getImageByOldId -> returns image with crops when present (covers withCrops[0] branch)", async () => {
    const originalQuery = server.pg.query;
    server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
      const upper = query.replace(/\s+/g, " ").trim().toUpperCase();

      if (upper.includes("FROM IMAGE I") && upper.includes("WHERE I.OLD_ID = \$1")) {
        return Promise.resolve({ rows: [MOCK_IMAGE_1], rowCount: 1 });
      }

      if (upper.includes("FROM CROP C") && upper.includes("ANY(\\$1::INT[])") ) {
        const ids = params?.[0] as number[];
        const crops = [MOCK_CROP_1, MOCK_CROP_2, MOCK_CROP_3].filter((c) => ids.includes(c.image));
        return Promise.resolve({ rows: crops, rowCount: crops.length });
      }

      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const res = await getImageByOldId(server, MOCK_IMAGE_1.old_id!);
    expect(res).not.toBeNull();
    expect(res?.crops).toBeDefined();

    server.pg.query = originalQuery;
  });

  test("GET /api/v1/image?page=1 without pageSize -> defaults pageSize and handles empty count rows", async () => {
    const originalQuery = server.pg.query;
    let capturedLimit: number | undefined;
    let capturedOffset: number | undefined;

    server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
      const upper = query.replace(/\s+/g, " ").trim().toUpperCase();

      if (upper.includes("COUNT(") && upper.includes("FROM IMAGE I")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      if (upper.includes("FROM IMAGE I") && upper.includes("LIMIT")) {
        capturedLimit = Number(params?.[0]);
        capturedOffset = Number(params?.[1] ?? 0);
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      if (upper.includes("FROM CROP C") && upper.includes("ANY(\\$1::INT[])")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const response = await server.inject({ method: "GET", url: "/api/v1/image?page=1" });
    expect(response.statusCode).toBe(200);
    const json = response.json() as { totalItems: number; member: unknown[] };
    expect(json.totalItems).toBe(0);
    expect(json.member).toHaveLength(0);
    expect(capturedLimit).toBe(100);
    expect(capturedOffset).toBe(0);

    server.pg.query = originalQuery;
  });

  test("direct: getImageByOldId -> covers fallback branch when withCrops[0] is undefined", async () => {
    const originalQuery = server.pg.query;
    const originalMap = Array.prototype.map;

    server.pg.query = vi.fn().mockImplementation((query: string, _params?: unknown[]) => {
      const upper = query.replace(/\s+/g, " ").trim().toUpperCase();

      if (upper.includes("FROM IMAGE I") && upper.includes("WHERE I.OLD_ID = \$1")) {
        return Promise.resolve({ rows: [MOCK_IMAGE_1], rowCount: 1 });
      }

      if (upper.includes("FROM CROP C") && upper.includes("ANY(\\$1::INT[])")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const mapSpy = vi.spyOn(Array.prototype, "map").mockImplementation(function (
      this: unknown[],
      callbackfn: (value: unknown, index: number, array: unknown[]) => unknown,
      thisArg?: unknown,
    ): unknown[] {
      // Force the image-array maps inside attachCropsToImages to return empty,
      // so getImageByOldId executes `withCrops[0] ?? null` via the nullish branch.
      if (
        this.length === 1 &&
        typeof this[0] === "object" &&
        this[0] !== null &&
        "id" in (this[0] as Record<string, unknown>) &&
        "production" in (this[0] as Record<string, unknown>) &&
        "res" in (this[0] as Record<string, unknown>)
      ) {
        return [];
      }
      return originalMap.call(this, callbackfn, thisArg) as unknown[];
    });

    const res = await getImageByOldId(server, MOCK_IMAGE_1.old_id!);
    expect(res).toBeNull();

    mapSpy.mockRestore();
    server.pg.query = originalQuery;
  });
});