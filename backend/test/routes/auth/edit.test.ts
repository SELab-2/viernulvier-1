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
  super: true,
};

const mockEditedUsername = "Freddy";
const mockEditedPassword = "ILoveKarel<3";

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 404, username: mockUsername, super: true });

  server.pg.query = vi.fn().mockImplementation((query: string, values: unknown[]) => {
    const isUpdate = query.trim().toUpperCase().startsWith("UPDATE");

    if (isUpdate) {
      const row = { ...mockCreatedAdmin };

      // Extract SET clause assignments, e.g. ["username = $1", "password = $2"]
      const setClause = query.match(/SET\s+([\s\S]+?)\s+WHERE/i)?.[1] ?? "";
      const assignments = setClause.split(",").map(s => s.trim());

      for (const assignment of assignments) {
        const match = assignment.match(/^(\w+)\s*=\s*\$(\d+)/i);
        if (!match) continue;

        const [, field, indexStr] = match;
        const value = values[parseInt(indexStr) - 1];

        if (field === "username") row.username = value as string;
        if (field === "super") row.super = value as boolean;
        // password is intentionally ignored (not returned by the query)
      }

      return Promise.resolve({ rows: [row], rowCount: 1 });
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
      payload: { username: mockEditedUsername },
    });

    expect(response.statusCode).toBe(200);
    expect(AdminSchema.parse(response.json())).toEqual({
      id: mockCreatedAdmin.id,
      username: mockEditedUsername,
      profile_picture: mockCreatedAdmin.profile_picture,
      super: mockCreatedAdmin.super,
    });
  });

  test("PATCH /api/v1/auth/:id — updates password only", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/auth/${mockCreatedAdmin.id}`,
      cookies: { session: sessionCookie },
      payload: { password: mockEditedPassword },
    });

    expect(response.statusCode).toBe(200);
    // password shouldn't be returned, so the result is still equal to original
    expect(AdminSchema.parse(response.json())).toEqual(mockCreatedAdmin);
  });

  test("PATCH /api/v1/auth/:id — updates both username and password", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/auth/${mockCreatedAdmin.id}`,
      cookies: { session: sessionCookie },
      payload: { username: mockEditedUsername, password: mockEditedPassword },
    });

    expect(response.statusCode).toBe(200);
    expect(AdminSchema.parse(response.json())).toEqual({
      id: mockCreatedAdmin.id,
      username: mockEditedUsername,
      profile_picture: mockCreatedAdmin.profile_picture,
      super: mockCreatedAdmin.super,
    });
  });

  test("PATCH /api/v1/auth/:id — updates all fields", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/auth/${mockCreatedAdmin.id}`,
      cookies: { session: sessionCookie },
      payload: { username: mockEditedUsername, password: mockEditedPassword, super: false },
    });

    expect(response.statusCode).toBe(200);
    expect(AdminSchema.parse(response.json())).toEqual({
      id: mockCreatedAdmin.id,
      username: mockEditedUsername,
      profile_picture: mockCreatedAdmin.profile_picture,
      super: false,
    });
  });

  test("PATCH /api/v1/auth/:id — updating fields with existing values also works", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/auth/${mockCreatedAdmin.id}`,
      cookies: { session: sessionCookie },
      payload: { username: mockUsername, password: mockPassword },
    });

    expect(response.statusCode).toBe(200);
    expect(AdminSchema.parse(response.json())).toEqual(mockCreatedAdmin);
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

  test("PATCH /api/v1/auth/:id — returns 404 when update returns no rows", async () => {
    server.pg.query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/auth/${mockCreatedAdmin.id}`,
      cookies: { session: sessionCookie },
      payload: { username: mockEditedUsername },
    });

    expect(response.statusCode).toBe(404);
  });
});