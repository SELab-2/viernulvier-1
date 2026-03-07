import { describe, test, expect, beforeAll, vi, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { AdminSchema, type Admin } from "@viernulvier/shared/index.js";

let server: FastifyInstance;
let sessionCookie: string;

const mockUsername = "Karel"
const mockPassword = "securepassword123";
const mockCreatedAdmin: Admin = {
  id: 404,
  username: mockUsername,
  profile_picture: null,
};

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 1, username: "Admin1" });

  server.pg.query = vi.fn().mockImplementation((query: string) => {
    const isInsert = query.trim().toUpperCase().startsWith("INSERT");

    if (isInsert) {
      return Promise.resolve({ rows: [mockCreatedAdmin], rowCount: 1 });
    }

    return Promise.resolve({ rows: [], rowCount: 0 });
  });
});

afterAll(async () => {
  await server.close();
});

describe("Create on auth route", () => {
  test("POST /api/v1/auth — creates an admin and returns it", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth",
      cookies: { session: sessionCookie },
      payload: {
        username: mockUsername,
        password: mockPassword,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(AdminSchema.parse(response.json())).toEqual(mockCreatedAdmin);
  });

  test("POST /api/v1/auth — rejects short password", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth",
      cookies: { session: sessionCookie },
      payload: {
        username: mockUsername,
        password: "short",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  test("POST /api/v1/auth — rejects missing username", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth",
      cookies: { session: sessionCookie },
      payload: {
        password: mockPassword,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  test("POST /api/v1/auth — rejects missing password", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth",
      cookies: { session: sessionCookie },
      payload: {
        username: mockUsername,
      },
    });

    expect(response.statusCode).toBe(400);
  });
});