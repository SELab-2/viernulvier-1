import { describe, test, expect, beforeAll, vi, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { AdminSchema, type Admin } from "@viernulvier/shared/index.js";

let server: FastifyInstance;
let sessionCookie: string;

const mockUsername = "Karel";
const mockPassword = "securepassword123";
const mockCreatedAdmin: Admin = {
  id: 404,
  username: mockUsername,
  profile_picture: null,
};

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 404, username: "Karel" });

  server.pg.query = vi.fn().mockImplementation((query: string) => {
    const isUpdate = query.trim().toUpperCase().startsWith("UPDATE");

    if (isUpdate) {
      return Promise.resolve({ rows: [mockCreatedAdmin], rowCount: 1 });
    }

    return Promise.resolve({ rows: [], rowCount: 0 });
  });
});

afterAll(async () => {
  await server.close();
});

describe("Edit on auth route", () => {
  test("PATCH /api/v1/auth/:id — updates username only", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/auth/${mockCreatedAdmin.id}`,
      cookies: { session: sessionCookie },
      payload: { username: mockUsername },
    });

    expect(response.statusCode).toBe(200);
    expect(AdminSchema.parse(response.json().body)).toEqual(mockCreatedAdmin);
  });

  test("PATCH /api/v1/auth/:id — updates password only", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/auth/${mockCreatedAdmin.id}`,
      cookies: { session: sessionCookie },
      payload: { password: mockPassword },
    });

    expect(response.statusCode).toBe(200);
    expect(AdminSchema.parse(response.json().body)).toEqual(mockCreatedAdmin);
  });

  test("PATCH /api/v1/auth/:id — updates both username and password", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/auth/${mockCreatedAdmin.id}`,
      cookies: { session: sessionCookie },
      payload: { username: mockUsername, password: mockPassword },
    });

    expect(response.statusCode).toBe(200);
    expect(AdminSchema.parse(response.json().body)).toEqual(mockCreatedAdmin);
  });

  test("PATCH /api/v1/auth/:id — rejects short password", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/auth/${mockCreatedAdmin.id}`,
      cookies: { session: sessionCookie },
      payload: { password: "short" },
    });

    expect(response.statusCode).toBe(400);
  });
});