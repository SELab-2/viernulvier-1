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

let server: FastifyInstance;
let sessionCookie: string;

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 1, username: "Admin1" });

  server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
    const upper = query.replace(/\s+/g, " ").trim().toUpperCase();

    // ── All images (list) ──
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