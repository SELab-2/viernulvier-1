import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getBlogPost } from "@/services/blogposts";
import { ApiError } from "@/services/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockOk(body: unknown = {}, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status,
    statusText: "OK",
    json: vi.fn().mockResolvedValue(body),
  });
}

function mockError(body: unknown, status: number, statusText: string) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText,
    json: vi.fn().mockResolvedValue(body),
  });
}

function lastCall(): [string, RequestInit] {
  const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls as [
    string,
    RequestInit,
  ][];
  return calls[calls.length - 1]!;
}

const samplePost = {
  id: 42,
  blog: 1,
  title: "Hello world",
  content: { body: "Some text." },
  published_at: "2026-03-15T10:00:00.000Z",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => vi.stubGlobal("fetch", mockOk(samplePost)));
afterEach(() => vi.unstubAllGlobals());

describe("getBlogPost", () => {
  it("GETs /api/v1/blog/post/:id", async () => {
    await getBlogPost(42);
    expect(lastCall()[0]).toBe("/api/v1/blog/post/42");
    expect(lastCall()[1].method).toBeUndefined();
  });

  it("uses the correct id in the URL", async () => {
    await getBlogPost(7);
    expect(lastCall()[0]).toBe("/api/v1/blog/post/7");
  });

  it("returns the parsed response body", async () => {
    const result = await getBlogPost(42);
    expect(result).toEqual(samplePost);
  });

  it("throws ApiError on 404", async () => {
    vi.stubGlobal(
      "fetch",
      mockError({ error: "Not found" }, 404, "Not Found"),
    );
    await expect(getBlogPost(999)).rejects.toMatchObject({
      status: 404,
    });
    await expect(getBlogPost(999)).rejects.toBeInstanceOf(ApiError);
  });

  it("throws ApiError on generic server error", async () => {
    vi.stubGlobal(
      "fetch",
      mockError({ error: "Internal Server Error" }, 500, "Internal Server Error"),
    );
    await expect(getBlogPost(1)).rejects.toBeInstanceOf(ApiError);
  });
});
