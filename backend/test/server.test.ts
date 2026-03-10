import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { buildServer, getPort, start } from "@/server.js";
import type { FastifyInstance } from "fastify";

vi.mock("@/plugin/postgres.js", () => ({
  default: vi.fn(async (server: FastifyInstance) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    server.pg = { query: vi.fn() } as any;
  }),
}));

describe("Server", () => {
  let server: FastifyInstance | undefined;

  beforeEach(() => {
    process.env["DEBUG"] = "false";
    process.env["BACKEND_PORT"] = "0"; // port = 3333 is used for tests
  });

  afterEach(async () => {
    await server?.close();
    server = undefined;
  });

  describe("buildServer()", () => {
    test("Build server", async () => {
      server = await buildServer();

      expect(server).toBeDefined();
      expect(server.server).toBeDefined();
    });

    test("Build server with DEBUG", async () => {
      process.env["DEBUG"] = "true";

      server = await buildServer();

      expect(server.log).toBeDefined();
      expect(server.log.level).toBe("debug");
    });
  });

  describe("start()", () => {
    test("starts and listens", async () => {
      server = await start();
      expect(server.addresses()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ port: expect.any(Number) }),
        ]),
      );
    });
  });

  describe("getPort()", () => {
    test("default port is 3000 when BACKEND_PORT is unset", () => {
      delete process.env["BACKEND_PORT"];
      const port = getPort();
      expect(port).toBe(3000);
    });

    test("port is BACKEND_PORT", () => {
      process.env["BACKEND_PORT"] = "3001";
      const port = getPort();
      expect(port).toBe(3001);
    });
  });
});
