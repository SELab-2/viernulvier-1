import { describe, test, expect, beforeAll, afterAll, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { HallSchema, type Hall, type HallWithMeta } from "@viernulvier/shared/index.js";
import { HttpSuccess, HttpClientError } from "@/routes/helpers.js";

let server: FastifyInstance;
let sessionCookie: string;

const mockHalls: Array<Hall> = [
  { id: 1, old_id: 111, name: { nl: "Grote Zaal" }, address: "Sint-Pietersnieuwstraat 23" },
  { id: 2, old_id: 222, name: { nl: "Kleine Zaal" }, address: "Sint-Pietersnieuwstraat 23" },
];

const mockTime = new Date();
const mockHallsWithMeta: Array<HallWithMeta> = mockHalls.map((hall) => ({
  ...hall,
  created_by: 1,
  created_at: mockTime,
  updated_by: 1,
  updated_at: mockTime,
}));

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 1, username: "Admin1" });

  server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
    const upper = query.trim().toUpperCase();
    const isMeta = upper.includes("CREATED_AT");
    const id = params?.[0] !== undefined ? Number(params[0]) : undefined;

    if (isMeta) {
      const rows = id !== undefined
        ? mockHallsWithMeta.filter((h) => h["id"] === id)
        : mockHallsWithMeta;
      return Promise.resolve({ rows, rowCount: rows.length });
    }

    if (upper.startsWith("SELECT")) {
      const lower = query.toLowerCase();
      if (lower.includes("where old_id = $1")) {
        const oldId = Number(params?.[0]);
        const rows = mockHalls.filter((h) => h["old_id"] === oldId);
        return Promise.resolve({ rows, rowCount: rows.length });
      }
      const rows = id !== undefined
        ? mockHalls.filter((h) => h["id"] === id)
        : mockHalls;
      return Promise.resolve({ rows, rowCount: rows.length });
    }

    throw new Error(`Unexpected query in fetch tests: ${query}`);
  });
});

afterAll(async () => {
  await server.close();
});

describe("Hall fetch routes", () => {
  test("GET /api/v1/hall -> returns all halls", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/hall",
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(response.json()).toEqual(mockHalls);
  });

  test("GET /api/v1/hall?old_id=… -> returns halls matching legacy id", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/hall?old_id=111",
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(response.json()).toEqual([mockHalls[0]]);
  });

  test("GET /api/v1/hall/:id -> returns a single hall", async () => {
    const hall = mockHalls[0];

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/hall/${hall?.["id"]}`,
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(HallSchema.parse(response.json())).toEqual(hall);
  });

  test("GET /api/v1/hall/:id/meta — returns a hall with metadata", async () => {
    const hall = mockHallsWithMeta[1];

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/hall/${hall?.["id"]}/meta`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(HallSchema.withMeta().parse(response.json())).toEqual(hall);
  });

  test("GET /api/v1/hall/:id — returns 404 when hall not found", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/hall/99999",
    });

    expect(response.statusCode).toBe(HttpClientError.NotFound);
  });

  test("GET /api/v1/hall/:id/meta — returns 404 when hall not found", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/hall/99999/meta",
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(HttpClientError.NotFound);
  });

  test("GET /api/v1/hall/:id/meta — returns 401 when not logged in", async () => {
    const hall = mockHallsWithMeta[1];

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/hall/${hall?.["id"]}/meta`,
    });
  
    expect(response.statusCode).toBe(HttpClientError.Unauthorized);
  });
});
