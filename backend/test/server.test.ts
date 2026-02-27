import { describe, test, expect } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";

describe("Server", () => {
  test("Build server", async () => {
    const server: FastifyInstance = await buildServer();

    expect(server).toBeDefined();
    expect(server.server).toBeDefined();

    await server.close();
  });

  test("Build debug server enables logger", async () => {
    process.env["DEBUG"] = "true";

    const server: FastifyInstance = await buildServer();

    expect(server.log).toBeDefined();
    expect(server.log.level).toBe("debug");

    await server.close();
  });
});