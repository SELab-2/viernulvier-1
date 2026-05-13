import { describe, expect, it, vi, afterEach } from "vitest";

import { processProductionMediaGallery, type MediaItemJSON } from "@/scraper/entities/media/image.js";
import type { ScrapeRunStats } from "@/scraper/core/scrape-stats.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AUTH_TOKEN = "auth-token";
const LOGIN_TOKEN = "login-token";
const PRODUCTION_ID = 10;

function jsonOk(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function textResponse(body: string, status: number): Response {
  return new Response(body, { status });
}

function makeMediaItem(overrides: Partial<MediaItemJSON> = {}): MediaItemJSON {
  return {
    "@id": "/api/v1/media/items/1",
    "@type": "MediaItem",
    type: "foto",
    ...overrides,
  };
}

function makeGallery(items: MediaItemJSON[]) {
  return {
    "@id": "/api/v1/galleries/1",
    "@type": "MediaGallery",
    items,
  };
}

/**
 * Builds a fetch mock that handles the standard sequence:
 *   1. Gallery fetch
 *   2. Per-item: local existence check (GET /api/v1/image?oldId=…)
 *   3. Per-item: image POST (/api/v1/production/{id}/image)
 */
function buildFetchMock(
  galleryResponse: Response,
  existenceResponse: Response = jsonOk([]),
  postResponse: Response = jsonOk({ id: 77 }, 201),
) {
  return vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    const method = (init as RequestInit | undefined)?.method?.toUpperCase() ?? "GET";

    // Gallery fetch (Viernulvier URL — contains the IRI path)
    if (url.includes("/galleries/")) return galleryResponse;
    // Image POST
    if (url.includes("/production/") && method === "POST") return postResponse;
    // Local image existence check
    if (url.includes("/api/v1/image") && method === "GET") return existenceResponse;

    return textResponse("unexpected call", 500);
  });
}

// ---------------------------------------------------------------------------
// Gallery fetch failures
// ---------------------------------------------------------------------------

describe("processProductionMediaGallery — gallery fetch failures", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns without throwing when gallery fetch returns non-OK", async () => {
    buildFetchMock(textResponse("Internal Server Error", 500));

    await expect(
      processProductionMediaGallery(
        "/api/v1/galleries/1",
        PRODUCTION_ID,
        AUTH_TOKEN,
        LOGIN_TOKEN,
      ),
    ).resolves.toBeUndefined();
  });

  it("increments stats.errors when the gallery fetch itself throws", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network timeout"));

    const stats = {} as ScrapeRunStats;
    await processProductionMediaGallery(
      "/api/v1/galleries/99",
      PRODUCTION_ID,
      AUTH_TOKEN,
      LOGIN_TOKEN,
      stats,
    );
    expect(stats.errors).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Empty / missing gallery items
// ---------------------------------------------------------------------------

describe("processProductionMediaGallery — empty or missing items", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns without making further requests when gallery has no items field", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        jsonOk({ "@id": "/api/v1/galleries/1", "@type": "MediaGallery" /* no items key */ }),
      );

    await processProductionMediaGallery(
      "/api/v1/galleries/1",
      PRODUCTION_ID,
      AUTH_TOKEN,
      LOGIN_TOKEN,
    );

    // Only the gallery fetch call should have fired.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("processes zero items when gallery.items is an empty array", async () => {
    const fetchSpy = buildFetchMock(jsonOk(makeGallery([])));

    await processProductionMediaGallery(
      "/api/v1/galleries/1",
      PRODUCTION_ID,
      AUTH_TOKEN,
      LOGIN_TOKEN,
    );

    // Only the gallery fetch — no image existence checks or POSTs.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// extractIdFromIri failure
// ---------------------------------------------------------------------------

describe("processProductionMediaGallery — bad @id on media item", () => {
  afterEach(() => vi.restoreAllMocks());

  it("skips item and increments stats.media_skipped when @id cannot be parsed", async () => {
    const item = makeMediaItem({ "@id": "/api/v1/media/items/not-a-number" });
    buildFetchMock(jsonOk(makeGallery([item])));

    const stats = {} as ScrapeRunStats;
    await processProductionMediaGallery(
      "/api/v1/galleries/1",
      PRODUCTION_ID,
      AUTH_TOKEN,
      LOGIN_TOKEN,
      stats,
    );
    expect(stats.media_skipped).toBe(1);
  });

  it("returns null (internally) and does not POST when @id is unparseable", async () => {
    const item = makeMediaItem({ "@id": "/api/v1/media/items/bad" });
    const fetchSpy = buildFetchMock(jsonOk(makeGallery([item])));

    await processProductionMediaGallery(
      "/api/v1/galleries/1",
      PRODUCTION_ID,
      AUTH_TOKEN,
      LOGIN_TOKEN,
    );

    const postCalls = fetchSpy.mock.calls.filter(
      ([, init]) => (init as RequestInit)?.method?.toUpperCase() === "POST",
    );
    expect(postCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// fetchLocalImageIdByOldId errors (surface as thrown exceptions from inside createImageWithCrops)
// ---------------------------------------------------------------------------

describe("processProductionMediaGallery — local image existence-check errors", () => {
  afterEach(() => vi.restoreAllMocks());

  it("catches and logs when local image API returns non-OK (caught by outer try/catch)", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method?.toUpperCase() ?? "GET";
      if (url.includes("/galleries/")) return jsonOk(makeGallery([makeMediaItem()]));
      if (url.includes("/api/v1/image") && method === "GET")
        return textResponse("Server Error", 500);
      return textResponse("unexpected", 500);
    });

    const stats = {} as ScrapeRunStats;
    // The thrown error propagates up to processProductionMediaGallery's outer catch.
    await processProductionMediaGallery(
      "/api/v1/galleries/1",
      PRODUCTION_ID,
      AUTH_TOKEN,
      LOGIN_TOKEN,
      stats,
    );
    expect(stats.errors).toBe(1);
  });

  it("catches when local API returns multiple images for the same old_id", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method?.toUpperCase() ?? "GET";
      if (url.includes("/galleries/")) return jsonOk(makeGallery([makeMediaItem()]));
      if (url.includes("/api/v1/image") && method === "GET")
        return jsonOk([{ id: 1, old_id: 1 }, { id: 2, old_id: 1 }]);
      return textResponse("unexpected", 500);
    });

    const stats = {} as ScrapeRunStats;
    await processProductionMediaGallery(
      "/api/v1/galleries/1",
      PRODUCTION_ID,
      AUTH_TOKEN,
      LOGIN_TOKEN,
      stats,
    );
    expect(stats.errors).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Already-existing image
// ---------------------------------------------------------------------------

describe("processProductionMediaGallery — already-existing image", () => {
  afterEach(() => vi.restoreAllMocks());

  it("skips POST and increments stats.media_existing when image already imported", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockImplementation(async (input, init) => {
        const url = typeof input === "string" ? input : (input as Request).url;
        const method = (init as RequestInit | undefined)?.method?.toUpperCase() ?? "GET";
        if (url.includes("/galleries/")) return jsonOk(makeGallery([makeMediaItem()]));
        if (url.includes("/api/v1/image") && method === "GET")
          return jsonOk([{ id: 55, old_id: 1 }]); // already exists
        return textResponse("unexpected", 500);
      });

    const stats = {} as ScrapeRunStats;
    await processProductionMediaGallery(
      "/api/v1/galleries/1",
      PRODUCTION_ID,
      AUTH_TOKEN,
      LOGIN_TOKEN,
      stats,
    );

    expect(stats.media_existing).toBe(1);
    expect(stats.media_created).toBeUndefined();

    const postCalls = fetchSpy.mock.calls.filter(
      ([, init]) => (init as RequestInit)?.method?.toUpperCase() === "POST",
    );
    expect(postCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Image POST failure
// ---------------------------------------------------------------------------

describe("processProductionMediaGallery — image POST failure", () => {
  afterEach(() => vi.restoreAllMocks());

  it("increments stats.media_skipped when image POST returns non-OK", async () => {
    buildFetchMock(
      jsonOk(makeGallery([makeMediaItem()])),
      jsonOk([]),                          // existence check → not found
      textResponse("Conflict", 409),       // POST fails
    );

    const stats = {} as ScrapeRunStats;
    await processProductionMediaGallery(
      "/api/v1/galleries/1",
      PRODUCTION_ID,
      AUTH_TOKEN,
      LOGIN_TOKEN,
      stats,
    );
    expect(stats.media_skipped).toBe(1);
    expect(stats.media_created).toBeUndefined();
  });

  it("does not attempt crop creation when image POST fails", async () => {
    const fetchSpy = buildFetchMock(
      jsonOk(makeGallery([makeMediaItem({ crops: [{ "@id": "/api/v1/media/crops/1", "@type": "MediaCrop", name: "FE3_header", url: "https://cdn.example.com/a.jpg" }] })])),
      jsonOk([]),
      textResponse("Unprocessable Entity", 422),
    );

    await processProductionMediaGallery(
      "/api/v1/galleries/1",
      PRODUCTION_ID,
      AUTH_TOKEN,
      LOGIN_TOKEN,
    );

    // No crop-related GETs (oldId param) or POSTs to /crop should appear.
    const cropCalls = fetchSpy.mock.calls.filter(([url]) =>
      typeof url === "string" && url.includes("/crop"),
    );
    expect(cropCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Successful image creation
// ---------------------------------------------------------------------------

describe("processProductionMediaGallery — successful image creation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("increments stats.media_created on a successful POST", async () => {
    buildFetchMock(jsonOk(makeGallery([makeMediaItem()])));

    const stats = {} as ScrapeRunStats;
    await processProductionMediaGallery(
      "/api/v1/galleries/1",
      PRODUCTION_ID,
      AUTH_TOKEN,
      LOGIN_TOKEN,
      stats,
    );
    expect(stats.media_created).toBe(1);
    expect(stats.media_skipped).toBeUndefined();
  });

  it("does not call createCropsForImage when crops array is empty", async () => {
    const fetchSpy = buildFetchMock(
      jsonOk(makeGallery([makeMediaItem({ crops: [] })])),
    );

    await processProductionMediaGallery(
      "/api/v1/galleries/1",
      PRODUCTION_ID,
      AUTH_TOKEN,
      LOGIN_TOKEN,
    );

    // No crop existence-check GETs should have fired.
    const cropChecks = fetchSpy.mock.calls.filter(([url]) =>
      typeof url === "string" && url.includes("crop"),
    );
    expect(cropChecks).toHaveLength(0);
  });

  it("does not call createCropsForImage when crops field is absent", async () => {
    const item = makeMediaItem(); // no crops key
    const fetchSpy = buildFetchMock(jsonOk(makeGallery([item])));

    await processProductionMediaGallery(
      "/api/v1/galleries/1",
      PRODUCTION_ID,
      AUTH_TOKEN,
      LOGIN_TOKEN,
    );

    const cropChecks = fetchSpy.mock.calls.filter(([url]) =>
      typeof url === "string" && url.includes("crop"),
    );
    expect(cropChecks).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// res field construction (width × height)
// ---------------------------------------------------------------------------

describe("processProductionMediaGallery — image res field", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends res as 'WxH' string when both width and height are present", async () => {
    const item = makeMediaItem({ width: 1920, height: 1080 });
    const fetchSpy = buildFetchMock(jsonOk(makeGallery([item])));

    await processProductionMediaGallery(
      "/api/v1/galleries/1",
      PRODUCTION_ID,
      AUTH_TOKEN,
      LOGIN_TOKEN,
    );

    const postCall = fetchSpy.mock.calls.find(
      ([, init]) => (init as RequestInit)?.method?.toUpperCase() === "POST",
    );
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body.res).toBe("1920x1080");
  });

  it("sends res as null when width is absent", async () => {
    const item = makeMediaItem({ height: 1080 });
    const fetchSpy = buildFetchMock(jsonOk(makeGallery([item])));

    await processProductionMediaGallery(
      "/api/v1/galleries/1",
      PRODUCTION_ID,
      AUTH_TOKEN,
      LOGIN_TOKEN,
    );

    const postCall = fetchSpy.mock.calls.find(
      ([, init]) => (init as RequestInit)?.method?.toUpperCase() === "POST",
    );
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body.res).toBeNull();
  });

  it("sends res as null when height is absent", async () => {
    const item = makeMediaItem({ width: 1920 });
    const fetchSpy = buildFetchMock(jsonOk(makeGallery([item])));

    await processProductionMediaGallery(
      "/api/v1/galleries/1",
      PRODUCTION_ID,
      AUTH_TOKEN,
      LOGIN_TOKEN,
    );

    const postCall = fetchSpy.mock.calls.find(
      ([, init]) => (init as RequestInit)?.method?.toUpperCase() === "POST",
    );
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body.res).toBeNull();
  });

  it("sends res as null when neither width nor height is present", async () => {
    const item = makeMediaItem();
    const fetchSpy = buildFetchMock(jsonOk(makeGallery([item])));

    await processProductionMediaGallery(
      "/api/v1/galleries/1",
      PRODUCTION_ID,
      AUTH_TOKEN,
      LOGIN_TOKEN,
    );

    const postCall = fetchSpy.mock.calls.find(
      ([, init]) => (init as RequestInit)?.method?.toUpperCase() === "POST",
    );
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body.res).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Multiple items in one gallery
// ---------------------------------------------------------------------------

describe("processProductionMediaGallery — multiple items", () => {
  afterEach(() => vi.restoreAllMocks());

  it("processes each item in the gallery independently", async () => {
    const items = [
      makeMediaItem({ "@id": "/api/v1/media/items/1" }),
      makeMediaItem({ "@id": "/api/v1/media/items/2" }),
      makeMediaItem({ "@id": "/api/v1/media/items/3" }),
    ];

    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method?.toUpperCase() ?? "GET";
      if (url.includes("/galleries/")) return jsonOk(makeGallery(items));
      if (url.includes("/api/v1/image") && method === "GET") return jsonOk([]);
      if (url.includes("/production/") && method === "POST") return jsonOk({ id: 77 }, 201);
      return textResponse("unexpected", 500);
    });

    const stats = {} as ScrapeRunStats;
    await processProductionMediaGallery(
      "/api/v1/galleries/1",
      PRODUCTION_ID,
      AUTH_TOKEN,
      LOGIN_TOKEN,
      stats,
    );

    const postCalls = fetchSpy.mock.calls.filter(
      ([, init]) => (init as RequestInit)?.method?.toUpperCase() === "POST",
    );
    expect(postCalls).toHaveLength(3);
    expect(stats.media_created).toBe(3);
  });

  it("continues processing remaining items after one item's POST fails", async () => {
    const items = [
      makeMediaItem({ "@id": "/api/v1/media/items/10" }),
      makeMediaItem({ "@id": "/api/v1/media/items/11" }),
    ];

    let postCount = 0;
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method?.toUpperCase() ?? "GET";
      if (url.includes("/galleries/")) return jsonOk(makeGallery(items));
      if (url.includes("/api/v1/image") && method === "GET") return jsonOk([]);
      if (url.includes("/production/") && method === "POST") {
        postCount++;
        // First POST fails, second succeeds
        return postCount === 1 ? textResponse("Error", 500) : jsonOk({ id: 200 }, 201);
      }
      return textResponse("unexpected", 500);
    });

    const stats = {} as ScrapeRunStats;
    await processProductionMediaGallery(
      "/api/v1/galleries/1",
      PRODUCTION_ID,
      AUTH_TOKEN,
      LOGIN_TOKEN,
      stats,
    );

    expect(stats.media_skipped).toBe(1);
    expect(stats.media_created).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Authorization header forwarding
// ---------------------------------------------------------------------------

describe("processProductionMediaGallery — auth headers", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends X-AUTH-TOKEN on the gallery fetch to Viernulvier", async () => {
    const fetchSpy = buildFetchMock(jsonOk(makeGallery([])));

    await processProductionMediaGallery(
      "/api/v1/galleries/1",
      PRODUCTION_ID,
      AUTH_TOKEN,
      LOGIN_TOKEN,
    );

    const galleryCall = fetchSpy.mock.calls[0]!;
    const headers = (galleryCall[1] as RequestInit).headers as Record<string, string>;
    expect(headers["X-AUTH-TOKEN"]).toBe(AUTH_TOKEN);
  });

  it("sends Bearer token on the local image POST", async () => {
    const fetchSpy = buildFetchMock(jsonOk(makeGallery([makeMediaItem()])));

    await processProductionMediaGallery(
      "/api/v1/galleries/1",
      PRODUCTION_ID,
      AUTH_TOKEN,
      LOGIN_TOKEN,
    );

    const postCall = fetchSpy.mock.calls.find(
      ([, init]) => (init as RequestInit)?.method?.toUpperCase() === "POST",
    );
    const headers = (postCall![1] as RequestInit).headers as Record<string, string>;
    expect(headers["Authorization"]).toBe(`Bearer ${LOGIN_TOKEN}`);
  });
});
