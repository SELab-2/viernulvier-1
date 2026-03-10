import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";

let server: FastifyInstance;

beforeAll(async () => {
  server = await buildServer();
});

afterAll(async () => {
  await server.close();
});

describe("Logout on auth route", () => {
  test("POST /api/v1/auth/logout — clears session cookie and returns success", async () => {
    const sessionCookie = server.jwt.sign({ id: 404, username: "Karel" });

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
      ])
    );
  });

  test("POST /api/v1/auth/logout — succeeds without session cookie (just does nothing)", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
    });

    expect(response.statusCode).toBe(200);
  });
});