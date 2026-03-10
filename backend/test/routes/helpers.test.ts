import { describe, test, expect, vi } from "vitest";
import { z } from "zod";

import {
  HttpError,
  parseParams,
  parseSchema,
  replyHandler,
  HttpClientError,
  HttpSuccess,
} from "@/routes/helpers.js";

describe("HttpError", () => {
  test("creates error correctly", () => {
    const err = new HttpError(400, "Bad");

    expect(err.status).toBe(400);
    expect(err.message).toBe("Bad");
    expect(err.name).toBe("HttpError");
  });
});

describe("parseParams", () => {
  const mockRequest = (params: Record<string, string>) =>
    ({
      params,
      log: { error: vi.fn() },
    }) as any;

  test("parses valid params", () => {
    const req = mockRequest({ id: "10" });

    const schema = z.object({
      id: z.string(),
    });

    const result = parseParams(req, schema);

    expect(result).toEqual({ id: "10" });
  });

  test("throws on invalid params", () => {
    const req = mockRequest({});

    const schema = z.object({
      id: z.string(),
    });

    expect(() => parseParams(req, schema)).toThrow(HttpError);
  });
});

describe("parseSchema", () => {
  const mockServer = {
    log: { error: vi.fn() },
  } as any;

  test("parses valid object", () => {
    const schema = z.object({
      id: z.number(),
    });

    const result = parseSchema(mockServer, schema, { id: 1 });

    expect(result).toEqual({ id: 1 });
  });

  test("throws on invalid object", () => {
    const schema = z.object({
      id: z.number(),
    });

    expect(() =>
      parseSchema(mockServer, schema, { id: "bad" }),
    ).toThrow(HttpError);
  });
});

describe("replyHandler", () => {
  const mockServer = {} as any;

  const mockReply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn(),
  };

  test("returns 200 when handler returns data", async () => {
    const handler = async () => ({ id: 1 });

    const endpoint = replyHandler(mockServer, handler);

    await endpoint({} as any, mockReply as any);

    expect(mockReply.status).toBeCalledWith(HttpSuccess.OK);
  });

  test("returns 404 when handler returns null", async () => {
    const handler = async () => null;

    const endpoint = replyHandler(mockServer, handler);

    await endpoint({} as any, mockReply as any);

    expect(mockReply.status).toBeCalledWith(HttpClientError.NotFound);
  });
});