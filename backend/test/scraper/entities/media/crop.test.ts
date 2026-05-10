import { describe, expect, it, vi, afterEach } from "vitest";

import { createCropsForImage, type MediaItemCropJSON } from "@/scraper/entities/media/crop.js";
import type { ScrapeRunStats } from "@/scraper/core/scrape-stats.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LOGIN_TOKEN = "test-login-token";
const IMAGE_ID = 42;

function makeCrop(overrides: Partial<MediaItemCropJSON> = {}): MediaItemCropJSON {
  return {
    "@id": "/api/v1/media/crops/1",
    "@type": "MediaCrop",
    name: "FE3_header", // assumed to be in SCRAPER_CROP_NAMES allow-list
    url: "https://cdn.example.com/crop.jpg",
    ...overrides,
  };
}

function allowedCrop(id: number, urlSuffix = ""): MediaItemCropJSON {
  return makeCrop({
    "@id": `/api/v1/media/crops/${id}`,
    url: `https://cdn.example.com/crop-${id}${urlSuffix}.jpg`,
  });
}

/** Minimal ok JSON response. */
function jsonOk(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function textResponse(body: string, status: number): Response {
  return new Response(body, { status });
}

/** A tiny 3-byte ArrayBuffer acting as a fake image file. */
const FAKE_FILE_BYTES = new Uint8Array([0xff, 0xd8, 0xff]);

/** Default fetch mock for the happy-path sequence: existence-check → download → POST. */
function happyPathFetch(existsPayload: unknown[] = []): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    const method = (init as RequestInit | undefined)?.method?.toUpperCase() ?? "GET";

    if (url.includes("cdn.example.com")) {
      return new Response(FAKE_FILE_BYTES, { status: 200 });
    }
    if (method === "POST") {
      return jsonOk({ created: 1 }, 201);
    }
    // GET existence check
    return jsonOk(existsPayload);
  });
}

// ---------------------------------------------------------------------------
// Allow-list filtering
// ---------------------------------------------------------------------------

describe("createCropsForImage — allow-list filtering", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns 0 immediately when crops array is empty", async () => {
    expect(await createCropsForImage([], IMAGE_ID, LOGIN_TOKEN)).toBe(0);
  });

  it("returns 0 when no crops match the allow-list (non-empty input)", async () => {
    const crops = [makeCrop({ name: "not_in_allowlist" })];
    expect(await createCropsForImage(crops, IMAGE_ID, LOGIN_TOKEN)).toBe(0);
  });

  it("does not call fetch at all when all crops are filtered out", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const crops = [makeCrop({ name: "totally_unknown_crop_type" })];
    await createCropsForImage(crops, IMAGE_ID, LOGIN_TOKEN);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Individual crop skip conditions
// ---------------------------------------------------------------------------

describe("createCropsForImage — per-crop skip conditions", () => {
  afterEach(() => vi.restoreAllMocks());

  it("skips a crop that has no url and increments stats.crop_skipped", async () => {
    const { url: _url, ...noUrl } = makeCrop();
    const stats = {} as ScrapeRunStats;
    const count = await createCropsForImage(
      [noUrl as MediaItemCropJSON],
      IMAGE_ID,
      LOGIN_TOKEN,
      stats,
    );
    expect(count).toBe(0);
    expect(stats.crop_skipped).toBe(1);
  });

  it("skips a crop whose @id cannot be parsed to a finite number", async () => {
    const crop = makeCrop({ "@id": "/api/v1/media/crops/not-a-number" });
    const stats = {} as ScrapeRunStats;
    const count = await createCropsForImage([crop], IMAGE_ID, LOGIN_TOKEN, stats);
    expect(count).toBe(0);
    expect(stats.crop_skipped).toBe(1);
  });

  it("skips and increments stats when url is an empty string (non-absolute)", async () => {
    const crop = makeCrop({ url: "" });
    const stats = {} as ScrapeRunStats;
    await createCropsForImage([crop], IMAGE_ID, LOGIN_TOKEN, stats);
    // Empty string is not an absolute http URL — downloadFile returns null.
    expect(stats.crop_skipped).toBe(1);
  });

  it("skips and increments stats when url is a relative path", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(jsonOk([])); // existence check
    const crop = makeCrop({ url: "/relative/path/crop.jpg" });
    const stats = {} as ScrapeRunStats;
    await createCropsForImage([crop], IMAGE_ID, LOGIN_TOKEN, stats);
    expect(stats.crop_skipped).toBe(1);
  });

  it("skips a crop with no url without throwing when stats is undefined", async () => {
    const { url: _url, ...noUrl } = makeCrop();
    const count = await createCropsForImage([noUrl as MediaItemCropJSON], IMAGE_ID, LOGIN_TOKEN);
    expect(count).toBe(0);
  });

  it("skips a crop with unparseable @id without throwing when stats is undefined", async () => {
    const crop = makeCrop({ "@id": "/api/v1/media/crops/not-a-number" });
    const count = await createCropsForImage([crop], IMAGE_ID, LOGIN_TOKEN);
    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// fetchLocalCropIdByOldId error paths (surfaced via catch block)
// ---------------------------------------------------------------------------

describe("createCropsForImage — existence-check errors", () => {
  afterEach(() => vi.restoreAllMocks());

  it("skips crop and increments stats.crop_skipped when local API returns non-OK", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(textResponse("Server Error", 500));
    const stats = {} as ScrapeRunStats;
    await createCropsForImage([makeCrop()], IMAGE_ID, LOGIN_TOKEN, stats);
    expect(stats.crop_skipped).toBe(1);
  });

  it("skips crop when local API finds multiple crops with same old_id", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      jsonOk([
        { id: 1, old_id: 1 },
        { id: 2, old_id: 1 },
      ]),
    );
    const stats = {} as ScrapeRunStats;
    await createCropsForImage([makeCrop()], IMAGE_ID, LOGIN_TOKEN, stats);
    expect(stats.crop_skipped).toBe(1);
  });

  it("skips crop when existence check fetch throws a network error", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network failure"));
    const stats = {} as ScrapeRunStats;
    await createCropsForImage([makeCrop()], IMAGE_ID, LOGIN_TOKEN, stats);
    expect(stats.crop_skipped).toBe(1);
  });

  it("skips crop without throwing when stats is undefined and existence check throws", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network failure"));
    const count = await createCropsForImage([makeCrop()], IMAGE_ID, LOGIN_TOKEN);
    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Already-existing crop
// ---------------------------------------------------------------------------

describe("createCropsForImage — already-existing crop", () => {
  afterEach(() => vi.restoreAllMocks());

  it("skips upload and increments stats.crop_existing when crop already exists", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      jsonOk([{ id: 99, old_id: 1 }]), // existence check returns one record
    );
    const stats = {} as ScrapeRunStats;
    const count = await createCropsForImage([makeCrop()], IMAGE_ID, LOGIN_TOKEN, stats);
    expect(count).toBe(0);
    expect(stats.crop_existing).toBe(1);
    expect(stats.crop_skipped).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// downloadFile failure paths
// ---------------------------------------------------------------------------

describe("createCropsForImage — download failures", () => {
  afterEach(() => vi.restoreAllMocks());

  it("skips crop when file download returns non-OK status", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonOk([]))                        // existence check → not found
      .mockResolvedValueOnce(textResponse("Not Found", 404));  // download fails
    const stats = {} as ScrapeRunStats;
    const count = await createCropsForImage([makeCrop()], IMAGE_ID, LOGIN_TOKEN, stats);
    expect(count).toBe(0);
    expect(stats.crop_skipped).toBe(1);
  });

  it("skips crop when file download throws a network error", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonOk([]))           // existence check
      .mockRejectedValueOnce(new Error("Timeout")); // download throws
    const stats = {} as ScrapeRunStats;
    const count = await createCropsForImage([makeCrop()], IMAGE_ID, LOGIN_TOKEN, stats);
    expect(count).toBe(0);
    expect(stats.crop_skipped).toBe(1);
  });

  it("skips crop without throwing when stats is undefined and download fails", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonOk([]))
      .mockResolvedValueOnce(textResponse("Not Found", 404));
    const count = await createCropsForImage([makeCrop()], IMAGE_ID, LOGIN_TOKEN);
    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Happy path — single crop upload
// ---------------------------------------------------------------------------

describe("createCropsForImage — successful upload", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns 1 and increments stats.crop_created for a single allowed crop", async () => {
    happyPathFetch();
    const stats = {} as ScrapeRunStats;
    const count = await createCropsForImage([makeCrop()], IMAGE_ID, LOGIN_TOKEN, stats);
    expect(count).toBe(1);
    expect(stats.crop_created).toBe(1);
  });

  it("passes the correct old_id and type to the multipart POST", async () => {
    const fetchSpy = happyPathFetch();
    await createCropsForImage([makeCrop({ "@id": "/api/v1/media/crops/77" })], IMAGE_ID, LOGIN_TOKEN);
    const postCall = fetchSpy.mock.calls.find(
      ([, init]: [unknown, RequestInit?]) => (init as RequestInit)?.method?.toUpperCase() === "POST",
    );
    expect(postCall).toBeDefined();
    const formData = (postCall![1] as RequestInit).body as FormData;
    const dataField = formData.get("data") as string;
    const parsed = JSON.parse(dataField) as { crops: Array<{ oldId: number; type: string }> };
    expect(parsed.crops[0]!.oldId).toBe(77);
    expect(parsed.crops[0]!.type).toBe("FE3_header");
  });

  it("uses the Authorization header on the multipart POST", async () => {
    const fetchSpy = happyPathFetch();
    await createCropsForImage([makeCrop()], IMAGE_ID, LOGIN_TOKEN);
    const postCall = fetchSpy.mock.calls.find(
      ([, init]: [unknown, RequestInit?]) => (init as RequestInit)?.method?.toUpperCase() === "POST",
    );
    const headers = (postCall![1] as RequestInit).headers as Record<string, string>;
    expect(headers["Authorization"]).toBe(`Bearer ${LOGIN_TOKEN}`);
  });

  it("does not set stats fields that were not touched", async () => {
    happyPathFetch();
    const stats = {} as ScrapeRunStats;
    await createCropsForImage([makeCrop()], IMAGE_ID, LOGIN_TOKEN, stats);
    expect(stats.crop_skipped).toBeUndefined();
    expect(stats.crop_existing).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Batch POST failure
// ---------------------------------------------------------------------------

describe("createCropsForImage — batch POST failure", () => {
  afterEach(() => vi.restoreAllMocks());

  it("increments stats.crop_skipped by the batch size when POST returns non-OK", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method?.toUpperCase() ?? "GET";
      if (url.includes("cdn.example.com")) return new Response(FAKE_FILE_BYTES, { status: 200 });
      if (method === "POST") return textResponse("Internal Server Error", 500);
      return jsonOk([]); // existence check
    });

    const stats = {} as ScrapeRunStats;
    const count = await createCropsForImage([makeCrop()], IMAGE_ID, LOGIN_TOKEN, stats);
    expect(count).toBe(0);
    expect(stats.crop_skipped).toBe(1);
  });

  it("increments stats.errors when the POST fetch throws", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method?.toUpperCase() ?? "GET";
      if (url.includes("cdn.example.com")) return new Response(FAKE_FILE_BYTES, { status: 200 });
      if (method === "POST") throw new Error("Connection reset");
      return jsonOk([]);
    });

    const stats = {} as ScrapeRunStats;
    const count = await createCropsForImage([makeCrop()], IMAGE_ID, LOGIN_TOKEN, stats);
    expect(count).toBe(0);
    expect(stats.errors).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Batching — more than 5 crops triggers multiple batch POSTs
// ---------------------------------------------------------------------------

describe("createCropsForImage — batching", () => {
  afterEach(() => vi.restoreAllMocks());

  it("issues two POST requests when 6 crops are ready to upload (batchSize = 5)", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method?.toUpperCase() ?? "GET";
      if (url.includes("cdn.example.com")) return new Response(FAKE_FILE_BYTES, { status: 200 });
      if (method === "POST") return jsonOk({ created: 1 }, 201);
      return jsonOk([]); // existence checks
    });

    const sixCrops = Array.from({ length: 6 }, (_, i) => allowedCrop(i + 1));
    const stats = {} as ScrapeRunStats;
    const count = await createCropsForImage(sixCrops, IMAGE_ID, LOGIN_TOKEN, stats);

    const postCalls = fetchSpy.mock.calls.filter(
      ([, init]) => (init as RequestInit)?.method?.toUpperCase() === "POST",
    );
    expect(postCalls).toHaveLength(2);
    expect(count).toBe(6);
    expect(stats.crop_created).toBe(6);
  });

  it("correctly splits crops across batches (first batch 5, second batch 1)", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method?.toUpperCase() ?? "GET";
      if (url.includes("cdn.example.com")) return new Response(FAKE_FILE_BYTES, { status: 200 });
      if (method === "POST") return jsonOk({ created: 1 }, 201);
      return jsonOk([]);
    });

    const sixCrops = Array.from({ length: 6 }, (_, i) => allowedCrop(i + 10));
    await createCropsForImage(sixCrops, IMAGE_ID, LOGIN_TOKEN);

    const postCalls = fetchSpy.mock.calls.filter(
      ([, init]) => (init as RequestInit)?.method?.toUpperCase() === "POST",
    );

    // Parse the data field from each batch POST to verify crop counts.
    const batch1Data = JSON.parse(
      (postCalls[0]![1] as RequestInit).body instanceof FormData
        ? ((postCalls[0]![1] as RequestInit).body as FormData).get("data") as string
        : "{}",
    ) as { crops: unknown[] };
    const batch2Data = JSON.parse(
      (postCalls[1]![1] as RequestInit).body instanceof FormData
        ? ((postCalls[1]![1] as RequestInit).body as FormData).get("data") as string
        : "{}",
    ) as { crops: unknown[] };

    expect(batch1Data.crops).toHaveLength(5);
    expect(batch2Data.crops).toHaveLength(1);
  });

  it("returns total across both batches even when first batch succeeds and second fails", async () => {
    let postCallCount = 0;
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method?.toUpperCase() ?? "GET";
      if (url.includes("cdn.example.com")) return new Response(FAKE_FILE_BYTES, { status: 200 });
      if (method === "POST") {
        postCallCount++;
        // First batch succeeds, second fails
        return postCallCount === 1
          ? jsonOk({ created: 1 }, 201)
          : textResponse("Error", 500);
      }
      return jsonOk([]);
    });

    const sixCrops = Array.from({ length: 6 }, (_, i) => allowedCrop(i + 20));
    const stats = {} as ScrapeRunStats;
    const count = await createCropsForImage(sixCrops, IMAGE_ID, LOGIN_TOKEN, stats);

    // Only the first batch (5 crops) succeeded.
    expect(count).toBe(5);
    expect(stats.crop_created).toBe(5);
    expect(stats.crop_skipped).toBe(1); // second batch (1 crop) skipped
  });
});

// ---------------------------------------------------------------------------
// Mixed allow-list + existing + new in one call
// ---------------------------------------------------------------------------

describe("createCropsForImage — mixed scenarios", () => {
  afterEach(() => vi.restoreAllMocks());

  it("handles a mix of existing, new, and no-url crops in one invocation", async () => {
    const crops: MediaItemCropJSON[] = [
      makeCrop({ "@id": "/api/v1/media/crops/10", url: "https://cdn.example.com/a.jpg" }), // will exist
      makeCrop({ "@id": "/api/v1/media/crops/11", url: "https://cdn.example.com/b.jpg" }), // new → upload
      makeCrop({ "@id": "/api/v1/media/crops/12" }), // no url → skip (url removed)
    ];
    // Remove url from third crop
    delete (crops[2] as Partial<MediaItemCropJSON>).url;

    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method?.toUpperCase() ?? "GET";

      if (url.includes("cdn.example.com")) return new Response(FAKE_FILE_BYTES, { status: 200 });
      if (method === "POST") return jsonOk({ created: 1 }, 201);

      // Existence checks: crop 10 exists, crop 11 does not
      if (url.includes("oldId=10")) return jsonOk([{ id: 99, old_id: 10 }]);
      return jsonOk([]); // crop 11 not found
    });

    const stats = {} as ScrapeRunStats;
    const count = await createCropsForImage(crops, IMAGE_ID, LOGIN_TOKEN, stats);

    expect(count).toBe(1);
    expect(stats.crop_existing).toBe(1);
    expect(stats.crop_skipped).toBe(1);
    expect(stats.crop_created).toBe(1);
  });
});
