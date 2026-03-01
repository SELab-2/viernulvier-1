import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/postgres.js", () => ({
  default: vi.fn(async (server: FastifyInstance) => {
    server.pg = { query: vi.fn() } as any;
  }),
}));

import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";

describe("Server", () => {
  beforeEach(() => {
    process.env["DEBUG"] = "false";
  })

  describe("buildServer()", () => {
    test("Build server", async () => {
      const server: FastifyInstance = await buildServer();

      expect(server).toBeDefined();
      expect(server.server).toBeDefined();

      await server.close();
    });

    test("Build server with DEBUG", async () => {
      process.env["DEBUG"] = "true";

      const server: FastifyInstance = await buildServer();

      expect(server.log).toBeDefined();
      expect(server.log.level).toBe("debug");

      await server.close();
    });
  });

  describe("start()", () => {
    beforeEach(() => {
      vi.resetModules();
    });

    test("starts on default port 3000 when BACKEND_PORT is unset", async () => {
      const { start } = await import("@/server.js");

      delete process.env["BACKEND_PORT"];
      const server = await start();
      
      expect(server.addresses()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ port: 3000 })
        ])
      );

      await server.close();
    });

    test("starts on configured port", async () => {
      const { start } = await import("@/server.js");

      process.env["BACKEND_PORT"] = "3001";
      const server = await start();

      expect(server.addresses()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ port: 3001 })
        ])
      );

      await server.close();
    });

    test("throws an error on failed DB connection", async () => {
      vi.doMock("@/db/postgres.js", () => ({
        default: vi.fn().mockRejectedValue(new Error("DB connection failed")),
      }));

      const { start } = await import("@/server.js");

      await expect(start()).rejects.toThrow("DB connection failed");
    });
  });
});