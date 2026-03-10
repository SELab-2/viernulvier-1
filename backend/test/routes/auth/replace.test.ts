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

describe("Replace on auth route", () => {
  test("PUT /api/v1/auth/:id — replaces an admin and returns it", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/auth/${mockCreatedAdmin.id}`,
      cookies: { session: sessionCookie },
      payload: { username: mockUsername, password: mockPassword },
    });

    expect(response.statusCode).toBe(200);
    expect(AdminSchema.parse(response.json().body)).toEqual(mockCreatedAdmin);
  });
});