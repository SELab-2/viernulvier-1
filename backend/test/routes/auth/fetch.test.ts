import { describe, test, expect, beforeAll, vi, afterAll, beforeEach } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { AdminSchema } from "@viernulvier/shared/index.js";
import { authorizeMock } from "@mocks/plugins/authorize.js";

vi.mock("@/plugins/authorize.js", () => import("@mocks/plugins/authorize.js"));

let server: FastifyInstance;
let sessionCookie: string;

const mockAdmins = [
  { id: 404, username: "Karel", profile_picture: null, super: true },
  { id: 405, username: "Stagaire", profile_picture: null, super: false },
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
  sessionCookie = server.jwt.sign({ id: 404, username: "Karel", super: true });
  authorizeMock.super = true;
});

beforeEach(async () => {
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
  describe("Fetch all admins", () => {
    test("GET /api/v1/auth", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/auth",
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().map((a: unknown) => AdminSchema.parse(a))).toEqual(mockAdmins);
    });

    test("GET /api/v1/auth — returns empty array when no admins found", async () => {
      server.pg.query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/auth",
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([]);
    });
  });

  describe("Fetch by id", () => {
    test("GET /api/v1/auth/:id", async () => {
      const admin = mockAdmins[1];

      const response = await server.inject({
        method: "GET",
        url: `/api/v1/auth/${admin?.id}`,
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(200);
      expect(AdminSchema.parse(response.json())).toEqual(admin);
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

    test("GET /api/v1/auth/:id/meta", async () => {
      const admin = mockAdminsWithMeta[1]

      const response = await server.inject({
        method: "GET",
        url: `/api/v1/auth/${admin?.id}/meta`,
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(200);
      expect(AdminSchema.withMeta().parse(response.json())).toEqual(admin);
    });
    
    test("GET /api/v1/auth/:id/meta — returns 404 when admin not found", async () => {
      const id = 123456;

      const response = await server.inject({
        method: "GET",
        url: `/api/v1/auth/${id}/meta`,
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("Fetch currently logged in admin", () => {
    test("GET /api/v1/auth/me", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(200);
      expect(AdminSchema.parse(response.json())).toEqual(mockAdmins[0]);
    });

    test("GET /api/v1/auth/me — returns 404 when admin not found", async () => {
      const ghostCookie = server.jwt.sign({ id: 999999, username: "ghost" });

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        cookies: { session: ghostCookie },
      });

      expect(response.statusCode).toBe(404);
    });

    test("GET /api/v1/auth/me/meta", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/auth/me/meta",
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(200);
      expect(AdminSchema.withMeta().parse(response.json())).toEqual(mockAdminsWithMeta[0]);
    });

    test("GET /api/v1/auth/me/meta — returns 404 when admin not found", async () => {
      const ghostCookie = server.jwt.sign({ id: 999999, username: "ghost" });

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/auth/me/meta",
        cookies: { session: ghostCookie },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});