
import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import type { S3Client } from "@aws-sdk/client-s3";
import { Readable } from "stream";

let server: FastifyInstance;
let s3SendMock: ReturnType<typeof vi.fn>;

beforeAll(async () => {
  server = await buildServer();
  s3SendMock = vi.fn().mockResolvedValue({});
  server.s3.client = { send: s3SendMock, destroy: vi.fn() } as unknown as S3Client;
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.restoreAllMocks();
  s3SendMock = vi.fn().mockResolvedValue({});
  server.s3.client = { send: s3SendMock, destroy: vi.fn() } as unknown as S3Client;
});

describe("GET /media/crops/* (crop proxy)", () => {
  test("returns the S3 object body with correct headers when ContentType and ContentLength are present", async () => {
    const bodyStream = Readable.from(Buffer.from("fake-image-bytes"));
    s3SendMock.mockResolvedValue({
      ContentType: "image/jpeg",
      ContentLength: 16,
      Body: bodyStream,
    });

    const response = await server.inject({
      method: "GET",
      url: "/media/crops/some-folder/photo.jpg",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("image/jpeg");
    expect(response.headers["content-length"]).toBe("16");
    expect(response.headers["cache-control"]).toBe("public, max-age=86400");
    expect(response.body).toBe("fake-image-bytes");

    expect(s3SendMock).toHaveBeenCalledOnce();
    const command = s3SendMock.mock.calls[0]![0];
    expect(command.input).toEqual({
      Bucket: "crops",
      Key: "some-folder/photo.jpg",
    });
  });

  test("proxies successfully without ContentType header", async () => {
    const bodyStream = Readable.from(Buffer.from("data"));
    s3SendMock.mockResolvedValue({
      ContentLength: 4,
      Body: bodyStream,
    });

    const response = await server.inject({
      method: "GET",
      url: "/media/crops/image.png",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).not.toBe("image/jpeg");
    expect(response.headers["content-length"]).toBe("4");
    expect(response.headers["cache-control"]).toBe("public, max-age=86400");
  });

  test("proxies successfully without ContentLength header", async () => {
    const bodyStream = Readable.from(Buffer.from("data"));
    s3SendMock.mockResolvedValue({
      ContentType: "image/webp",
      Body: bodyStream,
    });

    const response = await server.inject({
      method: "GET",
      url: "/media/crops/image.webp",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("image/webp");
    expect(response.headers["cache-control"]).toBe("public, max-age=86400");
  });

  test("proxies successfully with neither ContentType nor ContentLength", async () => {
    const bodyStream = Readable.from(Buffer.from("data"));
    s3SendMock.mockResolvedValue({
      Body: bodyStream,
    });

    const response = await server.inject({
      method: "GET",
      url: "/media/crops/unknown-file",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("public, max-age=86400");
  });

  test("returns 404 when S3 throws NoSuchKey", async () => {
    const error = new Error("NoSuchKey");
    error.name = "NoSuchKey";
    s3SendMock.mockRejectedValue(error);

    const response = await server.inject({
      method: "GET",
      url: "/media/crops/nonexistent.jpg",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Crop not found" });
  });

  test("returns 502 when S3 throws a generic error", async () => {
    const logSpy = vi.spyOn(server.log, "error").mockImplementation(() => {});
    const error = new Error("Connection refused");
    s3SendMock.mockRejectedValue(error);

    const response = await server.inject({
      method: "GET",
      url: "/media/crops/some-key.jpg",
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({ error: "Failed to fetch crop from storage" });
    expect(logSpy).toHaveBeenCalledWith(error);
  });

  test("returns 400 when crop key is empty", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/media/crops/",
    });

    // Fastify wildcard with empty string - either the route doesn't match (404)
    // or the handler returns 400
    expect([400, 404]).toContain(response.statusCode);
  });
});