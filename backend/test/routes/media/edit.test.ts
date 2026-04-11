import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import {
  MOCK_IMAGE_1,
  MOCK_CROP_1,
  MOCK_CROP_2,
} from "./fixtures.js";

let server: FastifyInstance;
let sessionCookie: string;
let s3SendMock: ReturnType<typeof vi.fn>;

const editedImage = {
  ...MOCK_IMAGE_1,
  res: "3840x2160",
};

const editedCrop = { 
  ...MOCK_CROP_1,
  type: "updated_type",
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

    if (upper.includes("FROM IMAGE I") && upper.includes("WHERE I.ID = \$1")) {
      if (options?.imageNotFound) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({ rows: [editedImage], rowCount: 1 });
    }

    if (upper.includes("FROM CROP C") && upper.includes("WHERE C.IMAGE = \$1")) {
      return Promise.resolve({ rows: [MOCK_CROP_1, MOCK_CROP_2], rowCount: 2 });
    }

    if (upper.includes("FROM CROP C") && upper.includes("WHERE C.ID = \$1")) {
      if (options?.cropNotFound) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({ rows: [editedCrop], rowCount: 1 });
    }

    if (upper.startsWith("UPDATE IMAGE")) {
      if (options?.imageNotFound) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({ rows: [{ id: editedImage.id }], rowCount: 1 });
    }

    if (upper.startsWith("UPDATE CROP")) {
      return Promise.resolve({ rows: [{ id: editedCrop.id }], rowCount: 1 });
    }

    // ── Catch-all ──
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
}

describe("Edit on image route", () => {
  test("PATCH /api/v1/image/:id -> updates image fields", async () => {
    mockPgQuery();

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}`,
      cookies: { session: sessionCookie },
      payload: {
        res: "3840x2160",
      },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toMatchObject({
      id: MOCK_IMAGE_1.id,
      res: "3840x2160",
    });
    expect(json.crops).toBeDefined();
    expect(json.crops).toHaveLength(2);
  });

  test("PATCH /api/v1/image/:id -> returns 404 when image not found", async () => {
    mockPgQuery({ imageNotFound: true });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}`,
      cookies: { session: sessionCookie },
      payload: {
        res: "3840x2160",
      },
    });

    expect(response.statusCode).toBe(404);
  });

  test("PATCH /api/v1/image/:id -> rejects empty body", async () => {
    mockPgQuery();

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}`,
      cookies: { session: sessionCookie },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  test("PATCH /api/v1/image/:id -> requires auth", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}`,
      payload: {
        res: "3840x2160",
      },
    });

    expect(response.statusCode).toBe(401);
  });

  test("PATCH /api/v1/image/:id -> updates old_id field", async () => {
    mockPgQuery();

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}`,
      cookies: { session: sessionCookie },
      payload: {
        old_id: 42,
      },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toMatchObject({ id: MOCK_IMAGE_1.id });
  });

  test("PATCH /api/v1/image/:id -> updates both res and old_id at once", async () => {
    mockPgQuery();

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}`,
      cookies: { session: sessionCookie },
      payload: {
        res: "3840x2160",
        old_id: null,
      },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toMatchObject({ id: MOCK_IMAGE_1.id, res: "3840x2160" });
  });
});

describe("Edit on crop route", () => {
  test("PATCH /api/v1/crop/:id -> updates crop type (JSON)", async () => {
    mockPgQuery();

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/crop/${MOCK_CROP_1.id}`,
      cookies: { session: sessionCookie },
      payload: {
        type: "updated_type",
      },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toMatchObject({
      id: MOCK_CROP_1.id,
      type: "updated_type",
    });
  });

  test("PATCH /api/v1/crop/:id -> updates crop type and replaces file (multipart)", async () => {
    mockPgQuery();

    const form = new FormData();
    form.append("data", JSON.stringify({ type: "updated_type" }));
    form.append("file", new Blob(["fake-image-data"], { type: "image/jpeg" }), "new-crop.jpg");

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/crop/${MOCK_CROP_1.id}`,
      cookies: { session: sessionCookie },
      payload: form,
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toMatchObject({
      id: MOCK_CROP_1.id,
      type: "updated_type",
    });
    expect(s3SendMock).toHaveBeenCalled();
  });

  test("PATCH /api/v1/crop/:id -> returns 404 when crop not found", async () => {
    mockPgQuery({ cropNotFound: true });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/crop/${MOCK_CROP_1.id}`,
      cookies: { session: sessionCookie },
      payload: {
        type: "updated_type",
      },
    });

    expect(response.statusCode).toBe(404);
  });

  test("PATCH /api/v1/crop/:id -> rejects when no fields to update", async () => {
    mockPgQuery();

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/crop/${MOCK_CROP_1.id}`,
      cookies: { session: sessionCookie },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  test("PATCH /api/v1/crop/:id -> requires auth", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/crop/${MOCK_CROP_1.id}`,
      payload: {
        type: "updated_type",
      },
    });

    expect(response.statusCode).toBe(401);
  });
  
  test("PATCH /api/v1/crop/:id -> multipart with type only (no file uploaded)", async () => {
    mockPgQuery();

    const form = new FormData();
    form.append("data", JSON.stringify({ type: "updated_type" }));

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/crop/${MOCK_CROP_1.id}`,
      cookies: { session: sessionCookie },
      payload: form,
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toMatchObject({
      id: MOCK_CROP_1.id,
      type: "updated_type",
    });
    expect(s3SendMock).not.toHaveBeenCalled();
  });

  test("PATCH /api/v1/crop/:id -> multipart with file only (no type change)", async () => {
    mockPgQuery();

    const form = new FormData();
    form.append("data", JSON.stringify({}));
    form.append("file", new Blob(["fake-image-data"], { type: "image/jpeg" }), "new-crop.jpg");

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/crop/${MOCK_CROP_1.id}`,
      cookies: { session: sessionCookie },
      payload: form,
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toMatchObject({ id: MOCK_CROP_1.id });
    expect(s3SendMock).toHaveBeenCalled();
  });

  test("PATCH /api/v1/crop/:id -> multipart with no type and no file returns 400", async () => {
    mockPgQuery();

    const form = new FormData();
    form.append("data", JSON.stringify({}));

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/crop/${MOCK_CROP_1.id}`,
      cookies: { session: sessionCookie },
      payload: form,
    });

    expect(response.statusCode).toBe(400);
  });
});