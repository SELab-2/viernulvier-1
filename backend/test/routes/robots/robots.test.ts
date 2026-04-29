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

describe("Robots.txt route", () => {
  test("GET /robots.txt -> returns 200 with correct content type", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/robots.txt",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toMatch(/text\/plain/);
  });

  test("GET /robots.txt -> response body is a non-empty string", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/robots.txt",
    });

    expect(typeof response.body).toBe("string");
    expect(response.body.length).toBeGreaterThan(0);
  });

  test("GET /robots.txt -> contains User-agent directive", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/robots.txt",
    });

    expect(response.body).toContain("User-agent:");
  });

  test("GET /robots.txt -> does not require authentication", async () => {
    // No session cookie provided — should still return 200
    const response = await server.inject({
      method: "GET",
      url: "/robots.txt",
    });

    expect(response.statusCode).toBe(200);
  });

  test("POST /robots.txt -> returns 404 for unsupported method", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/robots.txt",
    });

    expect(response.statusCode).toBe(404);
  });
});