import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";

let server: FastifyInstance;
let sessionCookie: string;

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 404, username: "Karel", jti: server.generateJti() });
});

afterAll(async () => {
  await server.close();
});

describe("Logout", () => {
  test("POST /api/v1/auth/logout — returns 401 without a session", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
    });

    expect(response.statusCode).toBe(401);
  });

  test("POST /api/v1/auth/logout — clears session cookie and returns success", async () => {
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

  test("POST /api/v1/auth/logout — returns 401 when token is revoked", async () => {
    // sessionCookie was already revoked in the previous test
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(401);
  });

  test("POST /api/v1/auth/logout — evicts jti from denylist after token expiry", async () => {
    const jti = server.generateJti();
    const shortLivedCookie = server.jwt.sign(
      { id: 404, username: "Karel", jti },
      { expiresIn: "1s" },
    );

    await server.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      cookies: { session: shortLivedCookie },
    });

    expect(server.tokenDenylist.has(jti)).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    expect(server.tokenDenylist.has(jti)).toBe(false);
  });

  test("POST /api/v1/auth/logout — handles token without jti", async () => {
    const cookie = server.jwt.sign({ id: 404, username: "Karel" }); // no jti

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      cookies: { session: cookie },
    });

    expect(response.statusCode).toBe(200);
  });
});