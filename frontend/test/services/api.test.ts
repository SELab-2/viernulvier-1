import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiFetch, ApiError } from "@/services/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a minimal Response-like mock that satisfies the parts of the
 * Fetch API that `apiFetch` uses.
 */
function makeFetchMock(
  body: unknown,
  status: number = 200,
  statusText: string = "OK",
) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: vi.fn().mockResolvedValue(body),
  });
}

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

describe("ApiError", () => {
  it("stores status and message", () => {
    const err = new ApiError(404, "Not found");
    expect(err.status).toBe(404);
    expect(err.message).toBe("Not found");
    expect(err.name).toBe("ApiError");
  });

  it("stores optional fields", () => {
    const fields = { username: ["Too long"] };
    const err = new ApiError(422, "Validation error", fields);
    expect(err.fields).toEqual(fields);
  });

  it("has undefined fields when not provided", () => {
    const err = new ApiError(400, "Bad request");
    expect(err.fields).toBeUndefined();
  });

  it("is instanceof Error", () => {
    expect(new ApiError(500, "Server error")).toBeInstanceOf(Error);
  });

  describe("convenience getters", () => {
    it.each([
      [401, "isUnauthorized"],
      [403, "isForbidden"],
      [404, "isNotFound"],
      [409, "isConflict"],
      [422, "isUnprocessable"],
    ] as [number, keyof ApiError][])(
      "status %i → %s is true",
      (status, getter) => {
        const err = new ApiError(status, "error");
        expect(err[getter]).toBe(true);
      },
    );

    it("returns false for non-matching status", () => {
      const err = new ApiError(500, "server error");
      expect(err.isUnauthorized).toBe(false);
      expect(err.isForbidden).toBe(false);
      expect(err.isNotFound).toBe(false);
      expect(err.isConflict).toBe(false);
      expect(err.isUnprocessable).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// apiFetch
// ---------------------------------------------------------------------------

describe("apiFetch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", makeFetchMock({ data: "ok" }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  it("prepends /api/v1 to the path", async () => {
    await apiFetch("/production");
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/production",
      expect.any(Object),
    );
  });

  it("sends credentials: include by default", async () => {
    await apiFetch("/production");
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("sets Content-Type: application/json when body is provided", async () => {
    await apiFetch("/production", { method: "POST", body: {} });
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("omits Content-Type header when no body is provided", async () => {
    await apiFetch("/production");
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.not.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("returns the parsed JSON response on 200", async () => {
    const payload = [{ id: 1 }];
    vi.stubGlobal("fetch", makeFetchMock(payload));
    const result = await apiFetch("/production");
    expect(result).toEqual(payload);
  });

  it("serialises the body to JSON", async () => {
    await apiFetch("/production", { method: "POST", body: { title: "x" } });
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(call[1].body).toBe(JSON.stringify({ title: "x" }));
  });

  it("sends no body when body option is omitted", async () => {
    await apiFetch("/production");
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(call[1].body).toBeUndefined();
  });

  // ── Native BodyInit (FormData, Blob, …) ─────────────────────────────────────
  // These must NOT be JSON-stringified and must NOT get an explicit
  // Content-Type header (the browser sets it with the multipart boundary).

  it("forwards FormData bodies without serialising or setting Content-Type", async () => {
    const formData = new FormData();
    formData.append("image", new Blob(["x"], { type: "image/jpeg" }), "image.jpg");

    await apiFetch("/production/1/image", { method: "POST", body: formData });

    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(call[1].body).toBe(formData);
    expect(call[1].headers).not.toHaveProperty("Content-Type");
  });

  it("forwards Blob bodies without serialising", async () => {
    const blob = new Blob(["binary"], { type: "application/octet-stream" });

    await apiFetch("/upload", { method: "POST", body: blob });

    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(call[1].body).toBe(blob);
    expect(call[1].headers).not.toHaveProperty("Content-Type");
  });

  it("forwards URLSearchParams bodies without serialising", async () => {
    const params = new URLSearchParams({ key: "value" });

    await apiFetch("/form", { method: "POST", body: params });

    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(call[1].body).toBe(params);
    expect(call[1].headers).not.toHaveProperty("Content-Type");
  });

  it("allows callers to set their own Content-Type on FormData requests", async () => {
    const formData = new FormData();

    await apiFetch("/x", {
      method: "POST",
      body: formData,
      headers: { "X-Custom": "value" },
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Custom": "value" }),
      }),
    );
  });

  it("merges extra headers with defaults when body is provided", async () => {
    await apiFetch("/production", {
      method: "POST",
      body: {},
      headers: { "X-Custom": "value" },
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-Custom": "value",
        }),
      }),
    );
  });

  it("passes additional fetch options (e.g. method)", async () => {
    await apiFetch("/production", { method: "DELETE" });
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  // ── 204 No Content ──────────────────────────────────────────────────────────

  it("returns undefined for 204 No Content without parsing JSON", async () => {
    const jsonFn = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        statusText: "No Content",
        json: jsonFn,
      }),
    );
    const result = await apiFetch<void>("/production/1");
    expect(result).toBeUndefined();
    expect(jsonFn).not.toHaveBeenCalled();
  });

  // ── Error responses ─────────────────────────────────────────────────────────

  it("throws ApiError on 401 with message from response body", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetchMock({ error: "Unauthorized" }, 401, "Unauthorized"),
    );
    await expect(apiFetch("/protected")).rejects.toBeInstanceOf(ApiError);
    await expect(apiFetch("/protected")).rejects.toMatchObject({
      status: 401,
      message: "Unauthorized",
    });
  });

  it("throws ApiError on 404", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetchMock({ error: "Not found" }, 404, "Not Found"),
    );
    await expect(apiFetch("/production/999")).rejects.toMatchObject({
      status: 404,
      message: "Not found",
    });
  });

  it("uses 'message' field from error body when 'error' is absent", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetchMock({ message: "Custom message" }, 400, "Bad Request"),
    );
    await expect(apiFetch("/foo")).rejects.toMatchObject({
      message: "Custom message",
    });
  });

  it("falls back to statusText when error body has no error/message", async () => {
    vi.stubGlobal("fetch", makeFetchMock({}, 500, "Internal Server Error"));
    await expect(apiFetch("/foo")).rejects.toMatchObject({
      message: "Internal Server Error",
    });
  });

  it("attaches fields from 422 response body", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetchMock(
        { error: "Validation failed", fields: { username: ["Too long"] } },
        422,
        "Unprocessable Entity",
      ),
    );
    await expect(apiFetch("/auth")).rejects.toMatchObject({
      status: 422,
      fields: { username: ["Too long"] },
    });
  });

  it("falls back to statusText when error body is not valid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        json: vi.fn().mockRejectedValue(new SyntaxError("bad json")),
      }),
    );
    await expect(apiFetch("/foo")).rejects.toMatchObject({
      status: 503,
      message: "Service Unavailable",
    });
  });
});
