import { describe, test, expect, beforeAll, vi, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { AdminSchema, type Admin } from "@viernulvier/shared/index.js";
import { hashPassword } from "@/routes/auth/handlers/hash.js";

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

  const hashedPassword = await hashPassword(mockPassword);

  server.pg.query = vi.fn().mockImplementation(async (query: string, values: unknown[]) => {
    const upper = query.trim().toUpperCase();

    if (upper.startsWith("SELECT")) {
      const identifier = values[1];

      // simulate "user not found"
      if (identifier !== mockCreatedAdmin.id) {
        return { rows: [], rowCount: 0 };
      }

      return {
        rows: [
          {
            id: mockCreatedAdmin.id,
            password: hashedPassword,
            super: mockCreatedAdmin.super,
          },
        ],
        rowCount: 1,
      };
    }

    if (upper.startsWith("UPDATE")) {
      const row = { ...mockCreatedAdmin };

      // Extract SET clause assignments, e.g. ["username = $1", "password = $2"]
      const setClause = query.match(/SET\s+([\s\S]+?)\s+WHERE/i)?.[1] ?? "";
      const assignments = setClause.split(",").map(s => s.trim());

      for (const assignment of assignments) {
        const match = assignment.match(/^(\w+)\s*=\s*\$(\d+)/i);
        if (!match) continue;

        const [, field, indexStr] = match;
        const value = values[parseInt(indexStr!) - 1];

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
  describe("PATCH /api/v1/auth/:id", () => {
    test("updates username only", async () => {
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

    test("updates password only", async () => {
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

    test("updates both username and password", async () => {
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

    test("updates all fields", async () => {
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

    test("updating fields with existing values also works", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: `/api/v1/auth/${mockCreatedAdmin.id}`,
        cookies: { session: sessionCookie },
        payload: { username: mockUsername, password: mockPassword },
      });

      expect(response.statusCode).toBe(200);
      expect(AdminSchema.parse(response.json())).toEqual(mockCreatedAdmin);
    });

    test("rejects short password", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: `/api/v1/auth/${mockCreatedAdmin.id}`,
        cookies: { session: sessionCookie },
        payload: { password: "short" },
      });

      expect(response.statusCode).toBe(400);
    });

    test("returns 404 when update returns no rows", async () => {
      // save original mock
      const original = server.pg.query;

      server.pg.query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });

      const response = await server.inject({
        method: "PATCH",
        url: `/api/v1/auth/${mockCreatedAdmin.id}`,
        cookies: { session: sessionCookie },
        payload: { username: mockEditedUsername },
      });

      expect(response.statusCode).toBe(404);

      // restore original mock
      server.pg.query = original;
    });
  });

  describe("PATCH /api/v1/auth/me", () => {
    test("updates password", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: `/api/v1/auth/me`,
        cookies: { session: sessionCookie },
        payload: {
          oldPassword: mockPassword,
          newPassword: mockEditedPassword,
        },
      });

      expect(response.statusCode).toBe(204);
      // no content
      expect(response.body).toEqual("");
    });

    test("rejects when old password is incorrect", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: `/api/v1/auth/me`,
        cookies: { session: sessionCookie },
        payload: {
          oldPassword: "wrongPassword",
          newPassword: mockEditedPassword,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    test("password too short", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: `/api/v1/auth/me`,
        cookies: { session: sessionCookie },
        payload: {
          oldPassword: "short",
          newPassword: "alsoShort",
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});