import { describe, test, expect, beforeAll, vi, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { AdminSchema, type Admin } from "@viernulvier/shared/index.js";
import { authorizeMock } from "@mocks/plugins/authorize.js";

vi.mock("@/plugins/authorize.js", () => import("@mocks/plugins/authorize.js"));

let server: FastifyInstance;
let sessionCookie: string;

const mockUsername = "Karel";
const mockCreatedAdmin: Admin = {
  id: 404,
  username: mockUsername,
  profile_picture: null,
  super: true,
};

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 404, username: mockCreatedAdmin, super: true });
  authorizeMock.super = true;
});

afterAll(async () => {
  await server.close();
});

describe("Delete on auth route", () => {
  test("DELETE /api/v1/auth/:id — deletes an admin and returns it", async () => {
    server.pg.query = vi.fn().mockResolvedValue({ rows: [mockCreatedAdmin], rowCount: 1 });

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/auth/${mockCreatedAdmin.id}`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(200);
    expect(AdminSchema.parse(response.json())).toEqual(mockCreatedAdmin);
  });

  test("DELETE /api/v1/auth/:id — returns 404 when admin not found", async () => {
    server.pg.query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/auth/${mockCreatedAdmin.id}`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(404);
  });
});