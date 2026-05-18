import { HttpRedirect, HttpSuccess } from "@/routes/helpers.js";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

let server: FastifyInstance;

beforeAll(async () => {
  server = await buildServer();
});

afterAll(async () => {
  await server.close();
});

describe("Swagger edge case tests.", () => {
  test("Swagger docs site can be reached", async () => {

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/docs",
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
  })

  test("Swagger docs site can be reached", async () => {

    const response = await server.inject({
      method: "GET",
      url: "/api",
    });

    expect(response.statusCode).toBe(HttpRedirect.Found);
  })
})