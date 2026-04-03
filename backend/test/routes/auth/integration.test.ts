/* eslint-disable security/detect-object-injection */
import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { AdminSchema } from "@viernulvier/shared/index.js";
import { hashPassword } from "@/routes/auth/handlers/index.js";

let server: FastifyInstance;

const existingAdmin = {
  username: "Admin1",
  password: "securepassword123",
  super: true,
};

const newAdminPayload = {
  username: "Karel",
  password: "securepassword123",
  super: false,
};

const editedUsername = "KarelEdited";

// In-memory database
const mockDb: Array<{
  id: number;
  username: string;
  password: string;
  super: boolean;
  profile_picture: string | null;
  created_by: number;
  created_at: Date;
  updated_by: number;
  updated_at: Date;
}> = [];
let nextId = 1;

describe("Auth route integration", () => {
  let sessionCookie: string;
  let createdAdminId: number;

  beforeAll(async () => {
    server = await buildServer();

    const hashed = await hashPassword(existingAdmin.password);
    const seedId = nextId++;
    mockDb.push({
      id: seedId,
      username: existingAdmin.username,
      password: hashed,
      super: existingAdmin.super,
      profile_picture: null,
      created_by: seedId,
      created_at: new Date(),
      updated_by: seedId,
      updated_at: new Date(),
    });

    server.pg.query = vi.fn().mockImplementation((query: string, params: unknown[] = []) => {
      const q = query.trim().toUpperCase();

      // Login: SELECT id, password, super WHERE username = $1
      if (q.startsWith("SELECT") && q.includes("PASSWORD")) {
        const username = params[0] as string;
        const row = mockDb.find((a) => a.username === username);
        return Promise.resolve(row
          ? { rows: [{ id: row.id, password: row.password, super: row.super }], rowCount: 1 }
          : { rows: [], rowCount: 0 },
        );
      }

      // Fetch with meta: SELECT ... created_at ... WHERE id = $1
      if (q.startsWith("SELECT") && q.includes("CREATED_AT")) {
        const id = params[0] !== undefined ? Number(params[0]) : undefined;
        const rows = id !== undefined
          ? mockDb.filter((a) => a.id === id).map(({ password: _, ...rest }) => rest)
          : mockDb.map(({ password: _, ...rest }) => rest);
        return Promise.resolve({ rows, rowCount: rows.length });
      }

      // Fetch without meta: SELECT ... WHERE id = $1
      if (q.startsWith("SELECT")) {
        const id = params[0] !== undefined ? Number(params[0]) : undefined;
        const rows = (id !== undefined ? mockDb.filter((a) => a.id === id) : mockDb)
          .map(({ id, username, profile_picture, super: superField }) => ({ id, username, profile_picture, super: superField }));
        return Promise.resolve({ rows, rowCount: rows.length });
      }

      // Create: INSERT INTO admins ...
      if (q.startsWith("INSERT")) {
        const username = params[0] as string;
        const password = params[1] as string;
        const superField = params[2] as boolean;
        const createdBy = params[3] as number;
        const now = new Date();
        const newAdmin = {
          id: nextId++,
          username,
          password,
          super: superField,
          profile_picture: null,
          created_by: createdBy,
          created_at: now,
          updated_by: createdBy,
          updated_at: now,
        };
        mockDb.push(newAdmin);
        const { password: _, ...rest } = newAdmin;
        return Promise.resolve({ rows: [rest], rowCount: 1 });
      }

      // Edit: UPDATE admins SET ... WHERE id = $n
      if (q.startsWith("UPDATE")) {
        const id = params[params.length - 1] as number;
        const idx = mockDb.findIndex((a) => a.id === id);
        if (idx === -1) return Promise.resolve({ rows: [], rowCount: 0 });

        const setClause = query.match(/SET\s+([\s\S]+?)\s+WHERE/i)?.[1] ?? "";
        const assignments = setClause.split(",").map(s => s.trim());

        for (const assignment of assignments) {
          const match = assignment.match(/^(\w+)\s*=\s*\$(\d+)/i);
          if (!match) continue;

          const [, field, indexStr] = match;
          const value = params[parseInt(indexStr) - 1];

          if (field === "username") mockDb[idx]!.username = value as string;
          if (field === "password") mockDb[idx]!.password = value as string;
          if (field === "super") mockDb[idx]!.super = value as boolean;
        }

        const { password: _, ...rest } = mockDb[idx]!;
        return Promise.resolve({ rows: [rest], rowCount: 1 });
      }

      // Delete: DELETE FROM admins WHERE id = $1
      if (q.startsWith("DELETE")) {
        const id = Number(params[0]);
        const idx = mockDb.findIndex((a) => a.id === id);
        if (idx === -1) return Promise.resolve({ rows: [], rowCount: 0 });
        const [deleted] = mockDb.splice(idx, 1);
        const { password: _, ...rest } = deleted!;
        return Promise.resolve({ rows: [rest], rowCount: 1 });
      }

      return Promise.resolve({ rows: [], rowCount: 0 });
    });
  });

  afterAll(async () => {
    await server.close();
  });

  test("1. POST /api/v1/auth/login — logs in as existing admin", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { username: existingAdmin.username, password: existingAdmin.password },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ token: expect.any(String) });

    const cookie = response.cookies.find((c) => c.name === "session");
    expect(cookie).toBeDefined();
    expect(cookie?.httpOnly).toBe(true);

    sessionCookie = cookie!.value;
  });

  test("2. POST /api/v1/auth — creates a new admin", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth",
      cookies: { session: sessionCookie },
      payload: newAdminPayload,
    });

    expect(response.statusCode).toBe(200);

    const body = AdminSchema.parse(response.json());
    expect(body.username).toBe(newAdminPayload.username);
    expect(body.super).toBe(newAdminPayload.super);

    createdAdminId = body.id;
  });

  test("3. PATCH /api/v1/auth/:id — edits the new admin's username and promotes him to super admin", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/auth/${createdAdminId}`,
      cookies: { session: sessionCookie },
      payload: { username: editedUsername, super: true },
    });

    expect(response.statusCode).toBe(200);

    const body = AdminSchema.parse(response.json());
    expect(body.id).toBe(createdAdminId);
    expect(body.username).toBe(editedUsername);
    expect(body.super).toBe(true);
  });

  test("4. GET /api/v1/auth/:id/meta — fetches the edited admin with metadata", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/auth/${createdAdminId}/meta`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(200);

    const body = AdminSchema.withMeta().parse(response.json());
    expect(body.id).toBe(createdAdminId);
    expect(body.username).toBe(editedUsername);
    expect(body.super).toBe(true);
    expect(body.created_at).toBeDefined();
    expect(body.updated_at).toBeDefined();
    expect(body.created_by).toBeDefined();
    expect(body.updated_by).toBeDefined();
  });

  test("5. DELETE /api/v1/auth/:id — deletes the new admin", async () => {
    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/auth/${createdAdminId}`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(200);

    const body = AdminSchema.parse(response.json());
    expect(body.id).toBe(createdAdminId);
  });

  test("6. GET /api/v1/auth/:id — returns 404 after deletion", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/auth/${createdAdminId}`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(404);
  });

  test("7. POST /api/v1/auth/logout — logs out and clears session cookie", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ success: true });
    expect(response.cookies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "session", value: "" }),
      ]),
    );
  });

  test("8. POST /api/v1/auth — returns 401 after logout", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth",
      payload: newAdminPayload,
    });

    expect(response.statusCode).toBe(401);
  });

  test("9. POST /api/v1/auth/login — logs in as non-super admin", async () => {
    mockDb[0]!.super = false;

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { username: existingAdmin.username, password: existingAdmin.password },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ token: expect.any(String) });

    const cookie = response.cookies.find((c) => c.name === "session");
    expect(cookie).toBeDefined();
    expect(cookie?.httpOnly).toBe(true);

    sessionCookie = cookie!.value;
  });

  test("10. GET /api/v1/auth — fetching admins is forbidden as non-super admin", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/auth`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(403);
  });

  test("11. GET /api/v1/auth/me — fetching yourself is allowed", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/auth/me`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(200);

    const body = AdminSchema.parse(response.json());
    expect(body.username).toBe(existingAdmin.username);
    expect(body.super).toBe(false);
  });
});