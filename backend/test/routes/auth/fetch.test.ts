import { describe, test, expect, beforeAll, vi, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { AdminSchema, type Admin, type AdminWithMeta } from "@viernulvier/shared/index.js";

let server: FastifyInstance;

const mockAdmins: Array<Admin> = [
  { id: 0, username: "", profile_picture: null },
  { id: 1, username: "", profile_picture: null },
];

const mockTime = new Date();

const mockAdminsWithMeta: Array<AdminWithMeta> = mockAdmins.map((admin) => ({
  ...admin,
  created_by: 0,
  created_at: mockTime,
  updated_by: 0,
  updated_at: mockTime,
}));

beforeAll(async () => {
  server = await buildServer();

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
    const id = 1

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/auth/${id}`,
    });

    console.log(response.statusCode, response.body);

    expect(response.statusCode).toBe(200);
    expect(AdminSchema.parse(response.json())).toEqual(mockAdmins[id]);
  });

  test("GET /api/v1/auth/:id/meta", async () => {
    const id = 1

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/auth/${id}/meta`,
    });

    expect(response.statusCode).toBe(200);
    expect(AdminSchema.withMeta().parse(response.json())).toEqual(mockAdminsWithMeta[id]);
  });
});