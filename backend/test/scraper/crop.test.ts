import { describe, expect, it, vi, afterEach } from "vitest";

import { createCropsForImage } from "@/scraper/crop.js";
import type { MediaItemCropJSON } from "@/scraper/crop.js";

const LOGIN_TOKEN = "test-token";
const IMAGE_ID = 42;

function makeCrop(overrides: Partial<MediaItemCropJSON> = {}): MediaItemCropJSON {
  return {
    "@id": "/api/v1/media/crops/1",
    "@type": "MediaCrop",
    name: "FE3_header",
    url: "https://cdn.example.com/crop.jpg",
    ...overrides,
  };
}

describe("createCropsForImage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 0 immediately when no crops match the allow-list", async () => {
    const crops = [makeCrop({ name: "not_in_allowlist" })];
    const count = await createCropsForImage(crops, IMAGE_ID, LOGIN_TOKEN);
    expect(count).toBe(0);
  });

  it("skips a crop that has no URL", async () => {
    const crops = [makeCrop({ url: undefined })];
    const count = await createCropsForImage(crops, IMAGE_ID, LOGIN_TOKEN);
    expect(count).toBe(0);
  });

  it("uploads an allowed crop and returns the count", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = input.toString();
      // existence check — crop not yet imported
      if (url.includes("/crop") && !url.includes("POST")) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      // file download
      if (url.includes("cdn.example.com")) {
        return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
      }
      // multipart upload
      return new Response(JSON.stringify({ created: 1 }), { status: 200 });
    });

    // Mock for GET (existence check) uses method hint via request init
    fetchSpy.mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("cdn.example.com")) {
        return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
      }
      if ((init?.method ?? "GET") === "GET" || !init?.method) {
        // existence check returns empty array (crop not yet imported)
        return new Response(JSON.stringify([]), { status: 200 });
      }
      // POST upload
      return new Response(JSON.stringify({ created: 1 }), { status: 200 });
    });

    const crops = [makeCrop()];
    const count = await createCropsForImage(crops, IMAGE_ID, LOGIN_TOKEN);
    expect(count).toBe(1);
  });
});
