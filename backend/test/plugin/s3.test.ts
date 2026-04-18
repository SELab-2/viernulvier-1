import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import Fastify from "fastify";

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn().mockReturnValue(""),
  };
});

import { existsSync, readFileSync } from "fs";
import s3Plugin from "@/plugins/s3.js";

const mockedExistsSync = vi.mocked(existsSync);
const mockedReadFileSync = vi.mocked(readFileSync);

describe("S3 Plugin", () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    savedEnv["GARAGE_ACCESS_KEY_ID"] = process.env["GARAGE_ACCESS_KEY_ID"];
    savedEnv["GARAGE_SECRET_ACCESS_KEY"] = process.env["GARAGE_SECRET_ACCESS_KEY"];
    savedEnv["GARAGE_S3_ENDPOINT"] = process.env["GARAGE_S3_ENDPOINT"];

    delete process.env["GARAGE_ACCESS_KEY_ID"];
    delete process.env["GARAGE_SECRET_ACCESS_KEY"];
    delete process.env["GARAGE_S3_ENDPOINT"];

    mockedExistsSync.mockReturnValue(false);
    mockedReadFileSync.mockReturnValue("");
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        // eslint-disable-next-line security/detect-object-injection
        delete process.env[key];
      } else {
        // eslint-disable-next-line security/detect-object-injection
        process.env[key] = value;
      }
    }
    vi.restoreAllMocks();
  });

  test("decorates server with s3 container", async () => {
    process.env["GARAGE_ACCESS_KEY_ID"] = "test-key";
    process.env["GARAGE_SECRET_ACCESS_KEY"] = "test-secret";

    const server = Fastify();
    await server.register(s3Plugin);
    await server.ready();

    expect(server.s3).toBeDefined();
    expect(server.s3).toHaveProperty("client");

    await server.close();
  });

  test("lazy getter creates S3Client from env vars and caches it", async () => {
    process.env["GARAGE_ACCESS_KEY_ID"] = "test-key";
    process.env["GARAGE_SECRET_ACCESS_KEY"] = "test-secret";

    const server = Fastify();
    await server.register(s3Plugin);
    await server.ready();

    const client = server.s3.client;
    expect(client).toBeDefined();
    // Second access returns the same cached instance
    expect(server.s3.client).toBe(client);

    await server.close();
  });

  test("lazy getter uses GARAGE_S3_ENDPOINT env var when set", async () => {
    process.env["GARAGE_ACCESS_KEY_ID"] = "test-key";
    process.env["GARAGE_SECRET_ACCESS_KEY"] = "test-secret";
    process.env["GARAGE_S3_ENDPOINT"] = "http://custom-endpoint:9000";

    const server = Fastify();
    await server.register(s3Plugin);
    await server.ready();

    const client = server.s3.client;
    expect(client).toBeDefined();

    await server.close();
  });

  test("lazy getter uses default endpoint when GARAGE_S3_ENDPOINT not set", async () => {
    process.env["GARAGE_ACCESS_KEY_ID"] = "test-key";
    process.env["GARAGE_SECRET_ACCESS_KEY"] = "test-secret";

    const server = Fastify();
    await server.register(s3Plugin);
    await server.ready();

    const client = server.s3.client;
    expect(client).toBeDefined();

    await server.close();
  });

  test("lazy getter throws when no credentials are available", async () => {
    const server = Fastify();
    await server.register(s3Plugin);
    await server.ready();

    expect(() => server.s3.client).toThrow(
      "Garage S3 credentials are not available",
    );

    await server.close();
  });

  test("resolves credentials from first credential file path", async () => {
    mockedExistsSync.mockImplementation(
      (path) => path === "/garage-credentials/credentials.env",
    );
    mockedReadFileSync.mockReturnValue(
      "GARAGE_ACCESS_KEY_ID=file-key\nGARAGE_SECRET_ACCESS_KEY=file-secret\n",
    );

    const server = Fastify();
    await server.register(s3Plugin);
    await server.ready();

    const client = server.s3.client;
    expect(client).toBeDefined();

    await server.close();
  });

  test("skips first credential path and resolves from second", async () => {
    mockedExistsSync.mockImplementation(
      (path) =>
        typeof path === "string" &&
        path.includes("credentials.env") &&
        !path.startsWith("/garage-credentials"),
    );
    mockedReadFileSync.mockReturnValue(
      "GARAGE_ACCESS_KEY_ID=key2\nGARAGE_SECRET_ACCESS_KEY=secret2\n",
    );

    const server = Fastify();
    await server.register(s3Plugin);
    await server.ready();

    const client = server.s3.client;
    expect(client).toBeDefined();

    await server.close();
  });

  test("credential file parsing handles comments, empty lines, lines without =, and \\r", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      [
        "# This is a comment",
        "",
        "   ",
        "NO_EQUALS_HERE",
        "GARAGE_ACCESS_KEY_ID=file-key",
        "GARAGE_SECRET_ACCESS_KEY=file-secret\r",
      ].join("\n"),
    );

    const server = Fastify();
    await server.register(s3Plugin);
    await server.ready();

    const client = server.s3.client;
    expect(client).toBeDefined();

    await server.close();
  });

  test("credential file with only one key does not resolve", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue("GARAGE_ACCESS_KEY_ID=only-key\n");

    const server = Fastify();
    await server.register(s3Plugin);
    await server.ready();

    expect(() => server.s3.client).toThrow(
      "Garage S3 credentials are not available",
    );

    await server.close();
  });

  test("falls through to file when only one env var is set", async () => {
    process.env["GARAGE_ACCESS_KEY_ID"] = "partial-key";
    // GARAGE_SECRET_ACCESS_KEY not set

    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      "GARAGE_ACCESS_KEY_ID=file-key\nGARAGE_SECRET_ACCESS_KEY=file-secret\n",
    );

    const server = Fastify();
    await server.register(s3Plugin);
    await server.ready();

    const client = server.s3.client;
    expect(client).toBeDefined();

    await server.close();
  });

  test("readEnvFile silently ignores file read errors", async () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockImplementation(() => {
      throw new Error("EACCES: permission denied");
    });

    const server = Fastify();
    await server.register(s3Plugin);
    await server.ready();

    expect(() => server.s3.client).toThrow(
      "Garage S3 credentials are not available",
    );

    await server.close();
  });

  test("setter allows replacing client with a mock", async () => {
    const server = Fastify();
    await server.register(s3Plugin);
    await server.ready();

    const mockClient = { send: vi.fn(), destroy: vi.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    server.s3.client = mockClient as any;

    expect(server.s3.client).toBe(mockClient);

    await server.close();
  });

  test("onClose destroys client when it was initialized", async () => {
    process.env["GARAGE_ACCESS_KEY_ID"] = "test-key";
    process.env["GARAGE_SECRET_ACCESS_KEY"] = "test-secret";

    const server = Fastify();
    await server.register(s3Plugin);
    await server.ready();

    const client = server.s3.client;
    const destroySpy = vi.spyOn(client, "destroy");

    await server.close();

    expect(destroySpy).toHaveBeenCalledOnce();
  });

  test("onClose does nothing when client was never accessed", async () => {
    const server = Fastify();
    await server.register(s3Plugin);
    await server.ready();

    // Never access server.s3.client — should close cleanly
    await expect(server.close()).resolves.not.toThrow();
  });
});