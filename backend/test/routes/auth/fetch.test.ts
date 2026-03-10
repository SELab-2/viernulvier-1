import { describe, test, expect, beforeAll, vi, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { AdminSchema } from "@viernulvier/shared/index.js";

let server: FastifyInstance;
let sessionCookie: string;

const mockAdmins = [
  { id: 404, username: "Karel", profile_picture: null },
  { id: 405, username: "Stagaire", profile_picture: null },
];

const mockTime = new Date();

const mockAdminsWithMeta = mockAdmins.map((admin) => ({
  ...admin,
  created_by: 404,
  created_at: mockTime,
  updated_by: 404,
  updated_at: mockTime,
}));

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 404, username: "Karel" });

  server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
    const isMeta = query.toLowerCase().includes("created_at") || query.toLowerCase().includes("updated_at");
    
    const id = params?.[0] !== undefined ? Number(params[0]) : undefined;

    if (isMeta) {
      const rows = id !== undefined
        ? mockAdminsWithMeta.filter((a) => a.id === id)
        : mockAdminsWithMeta;

      return Promise.resolve({ rows, rowCount: rows.length });
    } else {
      const rows = id !== undefined
        ? mockAdmins.filter((a) => a.id === id)
        : mockAdmins;

      return Promise.resolve({ rows, rowCount: rows.length });
    }
  });
});

afterAll(async () => {
  await server.close();
});

describe("Fetch on auth route", () => {
  test("GET /api/v1/auth/:id", async () => {
    const admin = mockAdmins[0];

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/auth/${admin?.id}`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(200);
    expect(AdminSchema.parse(response.json().body)).toEqual(admin);
  });

  test("GET /api/v1/auth/:id/meta", async () => {
    const admin = mockAdminsWithMeta[1]

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/auth/${admin?.id}/meta`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(200);
    expect(AdminSchema.withMeta().parse(response.json().body)).toEqual(admin);
  });

  test("GET /api/v1/auth/:id — returns 404 when admin not found", async () => {
    const id = 123456;

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/auth/${id}`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(404);
  });
});