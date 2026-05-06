import { describe, test, expect, beforeAll, vi, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { AdminSchema, type Admin } from "@viernulvier/shared/index.js";

let server: FastifyInstance;
let sessionCookie: string;

const mockLoggedInAdmin: Admin = {
  id: 404,
  username: "Karel",
  profile_picture: null,
  super: true,
};
const mockAdminToDelete: Admin = {
  id: 808,
  username: "Tom",
  profile_picture: null,
  super: false,
};

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 404, username: mockLoggedInAdmin, super: true });
});

afterAll(async () => {
  await server.close();
});

describe("Delete on auth route", () => {
  test("DELETE /api/v1/auth/:id — deletes an admin and returns it", async () => {
    server.pg.query = vi.fn().mockResolvedValue({ rows: [mockAdminToDelete], rowCount: 1 });

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/auth/${mockAdminToDelete.id}`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(200);
    expect(AdminSchema.parse(response.json())).toEqual(mockAdminToDelete);
  });
  test("DELETE /api/v1/auth/:id — returns 409 when trying to delete yourself", async () => {
    server.pg.query = vi.fn().mockResolvedValue({ rows: [mockLoggedInAdmin], rowCount: 1 });

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/auth/${mockLoggedInAdmin.id}`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(409);
  });

  test("DELETE /api/v1/auth/:id — returns 404 when admin not found", async () => {
    server.pg.query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/auth/123`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(404);
  });
});