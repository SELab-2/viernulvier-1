import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import {
  MOCK_IMAGE_1,
  MOCK_CROP_1,
} from "./fixtures.js";

let server: FastifyInstance;
let sessionCookie: string;
let s3SendMock: ReturnType<typeof vi.fn>;

const replacedImage = { 
  ...MOCK_IMAGE_1,
  res: "4096x2160",
  old_id: null,
};

const replacedCrop = {
  ...MOCK_CROP_1,
  type: "brand_new",
  url: "/media/crops/new-uuid.jpg",
};

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 1, username: "Admin1" });

  s3SendMock = vi.fn().mockResolvedValue({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server.s3.client = { send: s3SendMock, destroy: vi.fn() } as any;
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.restoreAllMocks();
  s3SendMock = vi.fn().mockResolvedValue({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server.s3.client = { send: s3SendMock, destroy: vi.fn() } as any;
});

function mockPgQuery(options?: { imageNotFound?: boolean; cropNotFound?: boolean }) {
  server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
    const upper = query.replace(/\s+/g, " ").trim().toUpperCase();

    // ── Single image by ID (fetch) ──
    if (upper.includes("FROM IMAGE I") && upper.includes("WHERE I.ID = $1")) {
      if (options?.imageNotFound) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({ rows: [replacedImage], rowCount: 1 });
    }

    // ── Crops by image ──
    if (upper.includes("FROM CROP C") && upper.includes("WHERE C.IMAGE = $1")) {
      if (options?.imageNotFound) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({ rows: [replacedCrop], rowCount: 1 });
    }

    // ── Single crop by ID (fetch) ──
    if (upper.includes("FROM CROP C") && upper.includes("WHERE C.ID = $1")) {
      if (options?.cropNotFound) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({ rows: [replacedCrop], rowCount: 1 });
    }

    // ── UPDATE image ──
    if (upper.startsWith("UPDATE IMAGE")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }

    // ── UPDATE crop ──
    if (upper.startsWith("UPDATE CROP")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }

    // ── DELETE crop rows ──
    if (upper.startsWith("DELETE FROM CROP")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }

    // ── INSERT crop ──
    if (upper.startsWith("INSERT INTO CROP")) {
      return Promise.resolve({ rows: [{ id: replacedCrop.id }], rowCount: 1 });
    }

    // ── Catch-all (e.g. authorize middleware) ──
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
}

function mockPgQueryNoExistingCrops() {
  server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
    const upper = query.replace(/\s+/g, " ").trim().toUpperCase();

    if (upper.includes("FROM IMAGE I") && upper.includes("WHERE I.ID = $1")) {
      return Promise.resolve({ rows: [replacedImage], rowCount: 1 });
    }

    if (upper.includes("FROM CROP C") && upper.includes("WHERE C.IMAGE = $1")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }

    if (upper.includes("FROM CROP C") && upper.includes("WHERE C.ID = $1")) {
      return Promise.resolve({ rows: [replacedCrop], rowCount: 1 });
    }

    if (upper.startsWith("UPDATE IMAGE")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }

    if (upper.startsWith("UPDATE CROP")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }

    if (upper.startsWith("DELETE FROM CROP")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }

    if (upper.startsWith("INSERT INTO CROP")) {
      return Promise.resolve({ rows: [{ id: replacedCrop.id }], rowCount: 1 });
    }

    return Promise.resolve({ rows: [], rowCount: 0 });
  });
}

describe("Replace on image route", () => {
  test("PUT /api/v1/image/:id -> replaces image metadata (JSON, no crops)", async () => {
    mockPgQuery();

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}`,
      cookies: { session: sessionCookie },
      payload: {
        res: "4096x2160",
        old_id: null,
      },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toMatchObject({
      id: MOCK_IMAGE_1.id,
      res: "4096x2160",
      old_id: null,
    });
    expect(json.crops).toBeDefined();
  });

  test("PUT /api/v1/image/:id -> returns 404 when image not found", async () => {
    mockPgQuery({ imageNotFound: true });

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}`,
      cookies: { session: sessionCookie },
      payload: {
        res: "4096x2160",
        old_id: null,
      },
    });

    expect(response.statusCode).toBe(404);
  });

  test("PUT /api/v1/image/:id -> rejects invalid body", async () => {
    mockPgQuery();

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}`,
      cookies: { session: sessionCookie },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  test("PUT /api/v1/image/:id -> requires auth", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}`,
      payload: {
        res: "4096x2160",
        old_id: null,
      },
    });

    expect(response.statusCode).toBe(401);
  });

  test("PUT /api/v1/image/:id -> replaces image with crops via multipart (old crops exist)", async () => {
    mockPgQuery();

    const form = new FormData();
    form.append(
      "data",
      JSON.stringify({
        res: "4096x2160",
        old_id: null,
        crops: [{ filename: "new-crop.jpg", type: "general" }],
      }),
    );
    form.append("file", new Blob(["fake-image-data"], { type: "image/jpeg" }), "new-crop.jpg");

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}`,
      cookies: { session: sessionCookie },
      payload: form,
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toMatchObject({ id: MOCK_IMAGE_1.id, res: "4096x2160" });
    expect(json.crops).toBeDefined();
    expect(s3SendMock).toHaveBeenCalled();
  });

  test("PUT /api/v1/image/:id -> replaces image with crops via multipart (no old crops to delete)", async () => {
    mockPgQueryNoExistingCrops();

    const form = new FormData();
    form.append(
      "data",
      JSON.stringify({
        res: "4096x2160",
        old_id: null,
        crops: [{ filename: "brand-new.jpg", type: "thumbnail" }],
      }),
    );
    form.append("file", new Blob(["fake-data"], { type: "image/jpeg" }), "brand-new.jpg");

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}`,
      cookies: { session: sessionCookie },
      payload: form,
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toMatchObject({ id: MOCK_IMAGE_1.id });
  });

  test("PUT /api/v1/image/:id -> rejects multipart when crop mapping references missing file", async () => {
    mockPgQuery();

    const form = new FormData();
    form.append(
      "data",
      JSON.stringify({
        res: "4096x2160",
        old_id: null,
        crops: [{ filename: "nonexistent.jpg", type: "general" }],
      }),
    );

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}`,
      cookies: { session: sessionCookie },
      payload: form,
    });

    expect(response.statusCode).toBe(400);
  });

  test("PUT /api/v1/image/:id -> multipart without crops only replaces image fields", async () => {
    mockPgQuery();

    const form = new FormData();
    form.append(
      "data",
      JSON.stringify({
        res: "4096x2160",
        old_id: null,
      }),
    );

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}`,
      cookies: { session: sessionCookie },
      payload: form,
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toMatchObject({ id: MOCK_IMAGE_1.id, res: "4096x2160" });
    expect(s3SendMock).not.toHaveBeenCalled();
  });

  test("PUT /api/v1/image/:id -> replaces image with multiple crops via multipart", async () => {
    mockPgQuery();

    const form = new FormData();
    form.append(
      "data",
      JSON.stringify({
        res: "4096x2160",
        old_id: null,
        crops: [
          { filename: "crop1.jpg", type: "general" },
          { filename: "crop2.jpg", type: "thumbnail" },
        ],
      }),
    );
    form.append("file1", new Blob(["fake-data-1"], { type: "image/jpeg" }), "crop1.jpg");
    form.append("file2", new Blob(["fake-data-2"], { type: "image/jpeg" }), "crop2.jpg");

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}`,
      cookies: { session: sessionCookie },
      payload: form,
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toMatchObject({ id: MOCK_IMAGE_1.id, res: "4096x2160" });
    // Two uploads + one deleteManyFromS3 call
    expect(s3SendMock).toHaveBeenCalled();
  });
});

describe("Replace on crop route", () => {
  test("PUT /api/v1/crop/:id -> replaces crop entirely (multipart)", async () => {
    mockPgQuery();

    const form = new FormData();
    form.append("data", JSON.stringify({ type: "brand_new" }));
    form.append("file", new Blob(["fake-image-data"], { type: "image/jpeg" }), "replacement.jpg");

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/crop/${MOCK_CROP_1.id}`,
      cookies: { session: sessionCookie },
      payload: form,
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toMatchObject({
      id: MOCK_CROP_1.id,
      type: "brand_new",
    });
    expect(s3SendMock).toHaveBeenCalled();
  });

  test("PUT /api/v1/crop/:id -> returns 404 when crop not found", async () => {
    mockPgQuery({ cropNotFound: true });

    const form = new FormData();
    form.append("data", JSON.stringify({ type: "brand_new" }));
    form.append("file", new Blob(["fake-image-data"], { type: "image/jpeg" }), "replacement.jpg");

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/crop/${MOCK_CROP_1.id}`,
      cookies: { session: sessionCookie },
      payload: form,
    });

    expect(response.statusCode).toBe(404);
  });

  test("PUT /api/v1/crop/:id -> rejects non-multipart request", async () => {
    mockPgQuery();

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/crop/${MOCK_CROP_1.id}`,
      cookies: { session: sessionCookie },
      payload: { type: "brand_new" },
    });

    expect(response.statusCode).toBe(400);
  });

  test("PUT /api/v1/crop/:id -> requires auth", async () => {
    const form = new FormData();
    form.append("data", JSON.stringify({ type: "brand_new" }));
    form.append("file", new Blob(["fake-image-data"], { type: "image/jpeg" }), "replacement.jpg");

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/crop/${MOCK_CROP_1.id}`,
      payload: form,
    });

    expect(response.statusCode).toBe(401);
  });

  test("PUT /api/v1/image/:id -> replaces image with crops via multipart (old crops exist)", async () => {
    mockPgQuery();

    const form = new FormData();
    form.append(
      "data",
      JSON.stringify({
        res: "4096x2160",
        old_id: null,
        crops: [{ filename: "new-crop.jpg", type: "general" }],
      }),
    );
    form.append("file", new Blob(["fake-image-data"], { type: "image/jpeg" }), "new-crop.jpg");

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}`,
      cookies: { session: sessionCookie },
      payload: form,
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toMatchObject({ id: MOCK_IMAGE_1.id, res: "4096x2160" });
    expect(json.crops).toBeDefined();
    expect(s3SendMock).toHaveBeenCalled();
  });

  test("PUT /api/v1/image/:id -> replaces image with crops via multipart (no old crops to delete)", async () => {
    mockPgQueryNoExistingCrops();

    const form = new FormData();
    form.append(
      "data",
      JSON.stringify({
        res: "4096x2160",
        old_id: null,
        crops: [{ filename: "brand-new.jpg", type: "thumbnail" }],
      }),
    );
    form.append("file", new Blob(["fake-data"], { type: "image/jpeg" }), "brand-new.jpg");

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}`,
      cookies: { session: sessionCookie },
      payload: form,
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toMatchObject({ id: MOCK_IMAGE_1.id });
  });

  test("PUT /api/v1/image/:id -> rejects multipart when crop mapping references missing file", async () => {
    mockPgQuery();

    const form = new FormData();
    form.append(
      "data",
      JSON.stringify({
        res: "4096x2160",
        old_id: null,
        crops: [{ filename: "nonexistent.jpg", type: "general" }],
      }),
    );

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}`,
      cookies: { session: sessionCookie },
      payload: form,
    });

    expect(response.statusCode).toBe(400);
  });

  test("PUT /api/v1/image/:id -> multipart without crops only replaces image fields", async () => {
    mockPgQuery();

    const form = new FormData();
    form.append(
      "data",
      JSON.stringify({
        res: "4096x2160",
        old_id: null,
      }),
    );

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}`,
      cookies: { session: sessionCookie },
      payload: form,
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toMatchObject({ id: MOCK_IMAGE_1.id, res: "4096x2160" });
    expect(s3SendMock).not.toHaveBeenCalled();
  });

  test("PUT /api/v1/crop/:id -> rejects multipart with no file uploaded", async () => {
    mockPgQuery();

    const form = new FormData();
    form.append("data", JSON.stringify({ type: "brand_new" }));

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/crop/${MOCK_CROP_1.id}`,
      cookies: { session: sessionCookie },
      payload: form,
    });

    expect(response.statusCode).toBe(400);
  });
  
});