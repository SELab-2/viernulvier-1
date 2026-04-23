import { describe, test, expect, vi } from "vitest";
import { parseMultipart, insertCrops, validateCropFiles } from "@/routes/media/handlers/multipart-helpers.js";
import type { FastifyRequest, FastifyInstance } from "fastify";
import type { S3Client } from "@aws-sdk/client-s3";

// helpers to build fake multipart parts 

interface FakeFieldPart {
  type: "field";
  fieldname: string;
  value: string;
}

interface FakeFilePart {
  type: "file";
  fieldname: string;
  filename: string;
  mimetype: string;
  toBuffer: () => Promise<Buffer>;
}

type FakePart = FakeFieldPart | FakeFilePart;

function fakeRequest(parts: FakePart[]): FastifyRequest {
  return {
    parts: () => ({
      async *[Symbol.asyncIterator]() {
        for (const p of parts) yield p;
      },
    }),
  } as unknown as FastifyRequest;
}

describe("parseMultipart", () => {
  test("parses a data field and file parts", async () => {
    const request = fakeRequest([
      { type: "field", fieldname: "data", value: JSON.stringify({ foo: "bar" }) },
      {
        type: "file",
        fieldname: "file",
        filename: "photo.jpg",
        mimetype: "image/jpeg",
        toBuffer: async () => Buffer.from("img-bytes"),
      },
    ]);

    const { data, files } = await parseMultipart(request);

    expect(data).toEqual({ foo: "bar" });
    expect(files.size).toBe(1);
    expect(files.has("photo.jpg")).toBe(true);
    expect(files.get("photo.jpg")!.mimetype).toBe("image/jpeg");
    expect(files.get("photo.jpg")!.buffer.toString()).toBe("img-bytes");
  });

  test("returns empty data when no data field is present", async () => {
    const request = fakeRequest([
      {
        type: "file",
        fieldname: "file",
        filename: "a.png",
        mimetype: "image/png",
        toBuffer: async () => Buffer.from("bytes"),
      },
    ]);

    const { data, files } = await parseMultipart(request);

    expect(data).toEqual({});
    expect(files.size).toBe(1);
  });

  test("collects multiple files", async () => {
    const request = fakeRequest([
      { type: "field", fieldname: "data", value: JSON.stringify({}) },
      {
        type: "file",
        fieldname: "file1",
        filename: "a.jpg",
        mimetype: "image/jpeg",
        toBuffer: async () => Buffer.from("a"),
      },
      {
        type: "file",
        fieldname: "file2",
        filename: "b.png",
        mimetype: "image/png",
        toBuffer: async () => Buffer.from("b"),
      },
    ]);

    const { files } = await parseMultipart(request);
    expect(files.size).toBe(2);
    expect(files.has("a.jpg")).toBe(true);
    expect(files.has("b.png")).toBe(true);
  });

  test("throws 400 when data field contains invalid JSON", async () => {
    const request = fakeRequest([
      { type: "field", fieldname: "data", value: "not json{{{" },
    ]);

    await expect(parseMultipart(request)).rejects.toThrow("Invalid JSON in 'data' field");
  });

  test("ignores non-data field parts", async () => {
    const request = fakeRequest([
      { type: "field", fieldname: "other", value: "ignored" },
      { type: "field", fieldname: "data", value: JSON.stringify({ ok: true }) },
    ]);

    const { data } = await parseMultipart(request);
    expect(data).toEqual({ ok: true });
  });
});

// ────────────────────────────────────────────
// validateCropFiles
// ────────────────────────────────────────────
describe("validateCropFiles", () => {
  test("does not throw when every mapping has a matching file", () => {
    const files = new Map<string, { buffer: Buffer; mimetype: string }>([
      ["a.jpg", { buffer: Buffer.from("a"), mimetype: "image/jpeg" }],
      ["b.png", { buffer: Buffer.from("b"), mimetype: "image/png" }],
    ]);

    expect(() =>
      validateCropFiles(
        [
          { filename: "a.jpg", type: "general" },
          { filename: "b.png", type: "thumbnail" },
        ],
        files,
      ),
    ).not.toThrow();
  });

  test("throws when a mapping has no matching file", () => {
    const files = new Map<string, { buffer: Buffer; mimetype: string }>([
      ["a.jpg", { buffer: Buffer.from("a"), mimetype: "image/jpeg" }],
    ]);

    expect(() =>
      validateCropFiles(
        [
          { filename: "a.jpg", type: "general" },
          { filename: "missing.png", type: "thumbnail" },
        ],
        files,
      ),
    ).toThrow("Missing file for crop mapping: missing.png");
  });

  test("does not throw for an empty mappings array", () => {
    const files = new Map<string, { buffer: Buffer; mimetype: string }>();
    expect(() => validateCropFiles([], files)).not.toThrow();
  });
});

// ────────────────────────────────────────────
// insertCrops
// ────────────────────────────────────────────
describe("insertCrops", () => {
  function mockServer() {
    const s3SendMock = vi.fn().mockResolvedValue({});
    const pgQueryMock = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });

    const server = {
      s3: {
        client: { send: s3SendMock, destroy: vi.fn() } as unknown as S3Client,
      },
      pg: { query: pgQueryMock },
    } as unknown as FastifyInstance;

    return { server, s3SendMock, pgQueryMock };
  }

  test("uploads each crop to S3 and inserts a DB row", async () => {
    const { server, s3SendMock, pgQueryMock } = mockServer();

    const files = new Map<string, { buffer: Buffer; mimetype: string }>([
      ["a.jpg", { buffer: Buffer.from("a-data"), mimetype: "image/jpeg" }],
      ["b.png", { buffer: Buffer.from("b-data"), mimetype: "image/png" }],
    ]);

    const mappings = [
      { filename: "a.jpg", type: "general" },
      { filename: "b.png", type: "thumbnail" },
    ];

    const now = new Date();
    await insertCrops(server, 42, mappings, files, 1, now);

    // One S3 upload per mapping
    expect(s3SendMock).toHaveBeenCalledTimes(2);

    // One INSERT per mapping
    expect(pgQueryMock).toHaveBeenCalledTimes(2);
    for (const call of pgQueryMock.mock.calls) {
      const query = (call[0] as string).replace(/\s+/g, " ").trim().toUpperCase();
      expect(query).toContain("INSERT INTO CROP");
      const params = call[1] as unknown[];
      expect(params[0]).toBe(42); // imageId
    }
  });

  test("skips mappings whose filename is not in the files map", async () => {
    const { server, s3SendMock, pgQueryMock } = mockServer();

    const files = new Map<string, { buffer: Buffer; mimetype: string }>([
      ["a.jpg", { buffer: Buffer.from("a-data"), mimetype: "image/jpeg" }],
    ]);

    const mappings = [
      { filename: "a.jpg", type: "general" },
      { filename: "not-uploaded.png", type: "thumbnail" },
    ];

    await insertCrops(server, 10, mappings, files, 1, new Date());

    expect(s3SendMock).toHaveBeenCalledTimes(1);
    expect(pgQueryMock).toHaveBeenCalledTimes(1);
  });

  test("does nothing when mappings are empty", async () => {
    const { server, s3SendMock, pgQueryMock } = mockServer();

    await insertCrops(server, 10, [], new Map(), 1, new Date());

    expect(s3SendMock).not.toHaveBeenCalled();
    expect(pgQueryMock).not.toHaveBeenCalled();
  });
});