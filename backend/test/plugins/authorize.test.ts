import { describe, test, expect, beforeAll, afterAll, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";

vi.mock("@/routes/auth/handlers/fetch.js", () => ({
  fetchAdminById: vi.fn(),
}));

import { fetchAdminById } from "@/routes/auth/handlers/fetch.js";

let server: FastifyInstance;

beforeAll(async () => {
  server = await buildServer();
});

afterAll(async () => {
  await server.close();
});

function makeToken(payload: object) {
  return server.jwt.sign(payload);
}

describe("authorize plugin", () => {
  test("returns 401 when no token is provided", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/auth/me",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "Unauthorized" });
  });

  test("returns 401 when token is invalid", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      cookies: { session: "invalid.token.here" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "Unauthorized" });
  });

  test("returns 401 when token jti is in the denylist", async () => {
    const token = makeToken({ id: 1, jti: "revoked-jti" });
    server.tokenDenylist.add("revoked-jti");

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      cookies: { session: token },
    });

    server.tokenDenylist.delete("revoked-jti");
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "Token has been revoked" });
  });

  test("returns 401 when payload has no id", async () => {
    const token = makeToken({ jti: "some-jti" });

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      cookies: { session: token },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "Unauthorized" });
  });

  test("returns 401 when admin is not found in the database", async () => {
    vi.mocked(fetchAdminById).mockReturnValueOnce(() => Promise.resolve([]));

    const token = makeToken({ id: 99 });

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      cookies: { session: token },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "Unauthorized" });
  });

  test("returns 403 when super is required but admin is not super", async () => {
    vi.mocked(fetchAdminById).mockReturnValueOnce(() =>
      Promise.resolve([{ id: 1, username: "Admin", super: false, profile_picture: null }]),
    );

    const token = makeToken({ id: 1 });

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/auth",
      cookies: { session: token },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Forbidden" });
  });

  test("passes through when token is valid and admin exists", async () => {
    vi.mocked(fetchAdminById).mockReturnValue(() =>
      Promise.resolve([{ id: 1, username: "Admin", super: false, profile_picture: null }]),
    );

    const token = makeToken({ id: 1 });

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      cookies: { session: token },
    });

    expect(response.statusCode).not.toBe(401);
    expect(response.statusCode).not.toBe(403);
  });

  test("passes through when super is required and admin is super", async () => {
    vi.mocked(fetchAdminById).mockReturnValue(() =>
      Promise.resolve([{ id: 1, username: "Admin", super: true, profile_picture: null }]),
    );

    const token = makeToken({ id: 1 });

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/auth",
      cookies: { session: token },
    });

    expect(response.statusCode).not.toBe(401);
    expect(response.statusCode).not.toBe(403);
  });
});