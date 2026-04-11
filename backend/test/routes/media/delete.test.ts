import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { S3Client } from "@aws-sdk/client-s3";
import type { FastifyInstance } from "fastify";
import {
  MOCK_IMAGE_1,
  MOCK_CROP_1,
  MOCK_CROP_2,
  imageWithCrops,
} from "./fixtures.js";

let server: FastifyInstance;
let sessionCookie: string;
let s3SendMock: ReturnType<typeof vi.fn>;

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 1, username: "Admin1" });

  // The delete handlers pass server.s3 (the container) to deleteManyFromS3/deleteFromS3,
  // which then call s3.send(). So we need send on BOTH the container AND the client.
  s3SendMock = vi.fn().mockResolvedValue({});
  const mockClient = { send: s3SendMock, destroy: vi.fn() };
  server.s3.client = mockClient as unknown as S3Client;;
  // Also add send to the container itself for delete handlers that pass server.s3 directly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (server.s3 as any).send = s3SendMock;
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.restoreAllMocks();
  s3SendMock = vi.fn().mockResolvedValue({});
  server.s3.client = { send: s3SendMock, destroy: vi.fn() } as unknown as S3Client;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (server.s3 as any).send = s3SendMock; 
});

function mockPgQuery(options?: { imageNotFound?: boolean; cropNotFound?: boolean }) {
  server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
    const upper = query.replace(/\s+/g, " ").trim().toUpperCase();

    if (upper.includes("FROM IMAGE I") && upper.includes("WHERE I.ID = \$1")) {
      if (options?.imageNotFound) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({ rows: [MOCK_IMAGE_1], rowCount: 1 });
    }

    if (upper.includes("FROM CROP C") && upper.includes("WHERE C.IMAGE = \$1")) {
      return Promise.resolve({ rows: [MOCK_CROP_1, MOCK_CROP_2], rowCount: 2 });
    }

    if (upper.includes("FROM CROP C") && upper.includes("WHERE C.ID = \$1")) {
      if (options?.cropNotFound) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({ rows: [MOCK_CROP_1], rowCount: 1 });
    }

    if (upper.startsWith("DELETE FROM IMAGE")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }

    if (upper.startsWith("DELETE FROM CROP")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }

    // ── Catch-all ──
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
}

describe("Delete on image route", () => {
  test("DELETE /api/v1/image/:id -> deletes image and returns it with crops", async () => {
    mockPgQuery();

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toEqual(imageWithCrops(MOCK_IMAGE_1, [MOCK_CROP_1, MOCK_CROP_2]));
    expect(s3SendMock).toHaveBeenCalled();
  });

  test("DELETE /api/v1/image/:id -> returns 404 when image not found", async () => {
    mockPgQuery({ imageNotFound: true });

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(404);
  });

  test("DELETE /api/v1/image/:id -> requires auth", async () => {
    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}`,
    });

    expect(response.statusCode).toBe(401);
  });
});

describe("Delete on crop route", () => {
  test("DELETE /api/v1/crop/:id -> deletes crop and returns it", async () => {
    mockPgQuery();

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/crop/${MOCK_CROP_1.id}`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toEqual(MOCK_CROP_1);
    expect(s3SendMock).toHaveBeenCalled();
  });

  test("DELETE /api/v1/crop/:id -> returns 404 when crop not found", async () => {
    mockPgQuery({ cropNotFound: true });

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/crop/${MOCK_CROP_1.id}`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(404);
  });

  test("DELETE /api/v1/crop/:id -> requires auth", async () => {
    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/crop/${MOCK_CROP_1.id}`,
    });

    expect(response.statusCode).toBe(401);
  });

  test("DELETE /api/v1/image/:id -> deletes image with no crops (skips S3 delete)", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.replace(/\s+/g, " ").trim().toUpperCase();

      if (upper.includes("FROM IMAGE I") && upper.includes("WHERE I.ID = $1")) {
        return Promise.resolve({ rows: [MOCK_IMAGE_1], rowCount: 1 });
      }

      if (upper.includes("FROM CROP C") && upper.includes("WHERE C.IMAGE = $1")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      if (upper.startsWith("DELETE FROM IMAGE")) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }

      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/image/${MOCK_IMAGE_1.id}`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json).toEqual(imageWithCrops(MOCK_IMAGE_1, []));
    expect(s3SendMock).not.toHaveBeenCalled();
  });
});