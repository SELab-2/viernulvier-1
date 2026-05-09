import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import type { S3Client } from "@aws-sdk/client-s3";
import {
  MOCK_IMAGE_1,
  MOCK_CROP_1,
  MOCK_CROP_2,
} from "./fixtures.js";

vi.mock("@/plugins/authorize.js", () => import("@mocks/plugins/authorize.js"));

let server: FastifyInstance;
let sessionCookie: string;
let s3SendMock: ReturnType<typeof vi.fn>;

const createdImage = {
  ...MOCK_IMAGE_1,
  res: "1920x1080",
  old_id: null,
};

const createdCrop = {
  ...MOCK_CROP_1,
  image: MOCK_IMAGE_1.id,
  type: "general",
  url: "/media/crops/new-uuid.jpg",
};

const createdCrop2 = {
  ...MOCK_CROP_2,
  image: MOCK_IMAGE_1.id,
  type: "thumbnail",
  url: "/media/crops/new-uuid-2.jpg",
};

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 1, username: "Admin1" });

  s3SendMock = vi.fn().mockResolvedValue({});
  server.s3.client = { send: s3SendMock, destroy: vi.fn() } as unknown as S3Client;
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.restoreAllMocks();
  s3SendMock = vi.fn().mockResolvedValue({});
  server.s3.client = { send: s3SendMock, destroy: vi.fn() } as unknown as S3Client;
});

function mockPgQuery(options?: { insertReturnsEmpty?: boolean; imageNotFound?: boolean }) {
  server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
    const upper = query.replace(/\s+/g, " ").trim().toUpperCase();

    if (upper.startsWith("INSERT INTO IMAGE")) {
      if (options?.insertReturnsEmpty) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({ rows: [{ id: createdImage.id }], rowCount: 1 });
    }

    if (upper.startsWith("INSERT INTO CROP")) {
      return Promise.resolve({ rows: [{ id: createdCrop.id }], rowCount: 1 });
    }

    if (upper.includes("SELECT ID FROM IMAGE") && upper.includes("WHERE ID = $1")) {
      if (options?.imageNotFound) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({ rows: [{ id: params?.[0] }], rowCount: 1 });
    }

    if (upper.includes("FROM IMAGE I") && upper.includes("WHERE I.ID = $1")) {
      return Promise.resolve({ rows: [createdImage], rowCount: 1 });
    }

    if (upper.includes("FROM CROP C") && upper.includes("WHERE C.IMAGE = $1")) {
      return Promise.resolve({ rows: [createdCrop, createdCrop2], rowCount: 2 });
    }

    return Promise.resolve({ rows: [], rowCount: 0 });
  });
}

function mockPgQuerySingleCrop() {
  server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
    const upper = query.replace(/\s+/g, " ").trim().toUpperCase();

    if (upper.startsWith("INSERT INTO IMAGE")) {
      return Promise.resolve({ rows: [{ id: createdImage.id }], rowCount: 1 });
    }

    if (upper.startsWith("INSERT INTO CROP")) {
      return Promise.resolve({ rows: [{ id: createdCrop.id }], rowCount: 1 });
    }

    if (upper.includes("SELECT ID FROM IMAGE") && upper.includes("WHERE ID = \$1")) {
      return Promise.resolve({ rows: [{ id: params?.[0] }], rowCount: 1 });
    }

    if (upper.includes("FROM IMAGE I") && upper.includes("WHERE I.ID = $1")) {
      return Promise.resolve({ rows: [createdImage], rowCount: 1 });
    }

    if (upper.includes("FROM CROP C") && upper.includes("WHERE C.IMAGE = $1")) {
      return Promise.resolve({ rows: [createdCrop], rowCount: 1 });
    }

    return Promise.resolve({ rows: [], rowCount: 0 });
  });
}

describe("Create on image route", () => {
  test("POST /api/v1/production/:productionId/image -> creates image with JSON body (no crops)", async () => {
    mockPgQuery();

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/production/1/image",
      cookies: { session: sessionCookie },
      payload: {
        res: "1920x1080",
        old_id: null,
      },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toMatchObject({
      id: createdImage.id,
      production: createdImage.production,
      res: createdImage.res,
    });
    expect(json.crops).toBeDefined();
  });

  test("POST /api/v1/production/:productionId/image -> creates image with crops (multipart)", async () => {
    mockPgQuerySingleCrop();

    const form = new FormData();
    form.append(
      "data",
      JSON.stringify({
        res: "1920x1080",
        old_id: null,
        crops: [{ filename: "photo.jpg", type: "general" }],
      }),
    );
    form.append("file", new Blob(["fake-image-data"], { type: "image/jpeg" }), "photo.jpg");

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/production/1/image",
      cookies: { session: sessionCookie },
      payload: form,
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toMatchObject({
      id: createdImage.id,
      production: createdImage.production,
      res: createdImage.res,
    });
    expect(json.crops).toHaveLength(1);
    expect(json.crops[0]).toMatchObject({ type: "general" });
    expect(s3SendMock).toHaveBeenCalled();
  });

  test("POST /api/v1/production/:productionId/image -> returns 404 when insert returns no row", async () => {
    mockPgQuery({ insertReturnsEmpty: true });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/production/1/image",
      cookies: { session: sessionCookie },
      payload: {
        res: "1920x1080",
        old_id: null,
      },
    });

    expect(response.statusCode).toBe(404);
  });

  test("POST /api/v1/production/:productionId/image -> requires auth", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/production/1/image",
      payload: {
        res: "1920x1080",
        old_id: null,
      },
    });

    expect(response.statusCode).toBe(401);
  });

  test("POST /api/v1/production/:productionId/image -> multipart without crops in data creates image only", async () => {
    mockPgQuerySingleCrop();

    const form = new FormData();
    form.append(
      "data",
      JSON.stringify({
        res: "1920x1080",
        old_id: null,
      }),
    );

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/production/1/image",
      cookies: { session: sessionCookie },
      payload: form,
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toMatchObject({ id: createdImage.id });
    expect(s3SendMock).not.toHaveBeenCalled();
  });

  test("POST /api/v1/production/:productionId/image -> multipart with extra non-file fields is accepted", async () => {
    mockPgQuerySingleCrop();

    const form = new FormData();
    form.append(
      "data",
      JSON.stringify({
        res: "1920x1080",
        old_id: null,
        crops: [{ filename: "photo.jpg", type: "general" }],
      }),
    );
    form.append("someOtherField", "ignored-value");
    form.append("file", new Blob(["fake-image-data"], { type: "image/jpeg" }), "photo.jpg");

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/production/1/image",
      cookies: { session: sessionCookie },
      payload: form,
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toMatchObject({ id: createdImage.id });
    expect(s3SendMock).toHaveBeenCalled();
  });

  test("POST /api/v1/production/:productionId/image -> creates image with res and old_id undefined", async () => {
    mockPgQuery();

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/production/1/image",
      cookies: { session: sessionCookie },
      payload: {},
    });

    expect([200, 400]).toContain(response.statusCode);
  });
});

describe("Create on crop route", () => {
  test("POST /api/v1/image/:imageId/crop -> uploads crops to existing image (multipart)", async () => {
    mockPgQuery();

    const form = new FormData();
    form.append(
      "data",
      JSON.stringify({
        crops: [{ filename: "crop1.jpg", type: "general" }],
      }),
    );
    form.append("file", new Blob(["fake-crop-data"], { type: "image/jpeg" }), "crop1.jpg");

    const response = await server.inject({
      method: "POST",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}/crop`,
      cookies: { session: sessionCookie },
      payload: form,
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBeGreaterThan(0);
    expect(s3SendMock).toHaveBeenCalled();
  });

  test("POST /api/v1/image/:imageId/crop -> returns 404 when image not found", async () => {
    mockPgQuery({ imageNotFound: true });

    const form = new FormData();
    form.append(
      "data",
      JSON.stringify({
        crops: [{ filename: "crop1.jpg", type: "general" }],
      }),
    );
    form.append("file", new Blob(["fake-crop-data"], { type: "image/jpeg" }), "crop1.jpg");

    const response = await server.inject({
      method: "POST",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}/crop`,
      cookies: { session: sessionCookie },
      payload: form,
    });

    expect(response.statusCode).toBe(404);
  });

  test("POST /api/v1/image/:imageId/crop -> rejects non-multipart request", async () => {
    mockPgQuery();

    const response = await server.inject({
      method: "POST",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}/crop`,
      cookies: { session: sessionCookie },
      payload: {
        crops: [{ filename: "crop1.jpg", type: "general" }],
      },
    });

    expect(response.statusCode).toBe(400);
  });

  test("POST /api/v1/image/:imageId/crop -> requires auth", async () => {
    const form = new FormData();
    form.append(
      "data",
      JSON.stringify({
        crops: [{ filename: "crop1.jpg", type: "general" }],
      }),
    );
    form.append("file", new Blob(["fake-crop-data"], { type: "image/jpeg" }), "crop1.jpg");

    const response = await server.inject({
      method: "POST",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}/crop`,
      payload: form,
    });

    expect(response.statusCode).toBe(401);
  });
});