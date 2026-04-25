import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getImagesForProduction } from "@/services/media";
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
