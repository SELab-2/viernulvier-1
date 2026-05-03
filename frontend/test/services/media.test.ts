import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getImagesForProduction,
  getImagesForProductionOrEmpty,
} from "@/services/media";
import type { ImageWithCrops } from "@/services/media";

function mockJsonFetch(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    json: vi.fn().mockResolvedValue(body),
  });
}

function lastFetchUrl(): string {
  const c = (fetch as ReturnType<typeof vi.fn>).mock.calls;
  return (c[c.length - 1] as [string])[0]!;
}

beforeEach(() => vi.stubGlobal("fetch", mockJsonFetch([])));
afterEach(() => vi.unstubAllGlobals());

describe("getImagesForProduction", () => {
  it("GETs /api/v1/production/:id/image", async () => {
    const payload: ImageWithCrops[] = [
      {
        id: 1,
        old_id: null,
        production: 9,
        res: null,
        crops: [],
      },
    ];
    vi.stubGlobal("fetch", mockJsonFetch(payload));
    const out = await getImagesForProduction(9);
    expect(out).toEqual(payload);
    expect(lastFetchUrl()).toBe("/api/v1/production/9/image");
  });
});

function mockErrorFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText: "Error",
    json: vi.fn().mockResolvedValue(body),
  });
}

describe("getImagesForProductionOrEmpty", () => {
  it("returns [] on HTTP 404 without console.warn", async () => {
    vi.stubGlobal("fetch", mockErrorFetch(404, { error: "Not found" }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = await getImagesForProductionOrEmpty(9);
    expect(out).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("returns [] and warns on non-404 HTTP errors (e.g. 503)", async () => {
    vi.stubGlobal("fetch", mockErrorFetch(503, { error: "Unavailable" }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = await getImagesForProductionOrEmpty(9);
    expect(out).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]![0])).toContain("[production 9]");
    expect(String(warn.mock.calls[0]![0])).toContain("503");
    warn.mockRestore();
  });

  it("returns [] and warns on non-ApiError failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = await getImagesForProductionOrEmpty(9);
    expect(out).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
