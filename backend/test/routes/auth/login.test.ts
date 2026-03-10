import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { vi } from "vitest";
import { hashPassword } from "@/routes/auth/handlers/index.js";

let server: FastifyInstance;

const mockUsername = "Karel";
const mockPassword = "securepassword123";

beforeAll(async () => {
  server = await buildServer();
});

afterAll(async () => {
  await server.close();
});

describe("Login on auth route", () => {
  test("POST /api/v1/auth/login — stores a cookie and returns success on valid credentials", async () => {
    const hashed = await hashPassword(mockPassword);
    server.pg.query = vi.fn().mockResolvedValue({ rows: [{ id: 404, password: hashed }], rowCount: 1 });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { username: mockUsername, password: mockPassword },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ success: true });
    expect(response.cookies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "session", httpOnly: true }),
      ])
    );
  });

  test("POST /api/v1/auth/login — returns 401 when username not found", async () => {
    server.pg.query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { username: "wronguser", password: mockPassword },
    });

    expect(response.statusCode).toBe(401);
  });

  test("POST /api/v1/auth/login — returns 401 on wrong password", async () => {
    const hashed = await hashPassword(mockPassword);
    server.pg.query = vi.fn().mockResolvedValue({ rows: [{ id: 404, password: hashed }], rowCount: 1 });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { username: mockUsername, password: "wrongpassword" },
    });

    expect(response.statusCode).toBe(401);
  });
});