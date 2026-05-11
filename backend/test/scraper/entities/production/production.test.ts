import {
  describe,
  expect,
  it,
  vi,
  beforeEach,
  afterEach,
} from "vitest";

import type { ProductionJSON } from "@/scraper/entities/production/production.js";
import type { ScrapeRunStats } from "@/scraper/core/scrape-stats.js";

import {
  hasImportableProductionTitle,
  scrapeProductionById,
  scrapeAllProductions,
} from "@/scraper/entities/production/production.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_PRODUCTION: ProductionJSON = {
  "@id": "/api/v1/productions/123",
  title: { nl: "Show" },
};

const PRODUCTION_WITH_GALLERIES: ProductionJSON = {
  "@id": "/api/v1/productions/123",
  title: { nl: "Show" },
  media_gallery: "/api/v1/galleries/1",
  review_gallery: { "@id": "/api/v1/galleries/2" },
  // poster_gallery intentionally absent to exercise the undefined branch of extractGalleryIri
};

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function jsonOk(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function textResponse(body: string, status: number): Response {
  return new Response(body, { status });
}

function notFoundLocally(): Response {
  return jsonOk({ items: [], total: 0 });
}

function foundLocally(id = 999): Response {
  return jsonOk({ items: [{ id }], total: 1 });
}

function jwtResponse(): Response {
  return jsonOk({ token: "jwt" });
}

function tagTypesResponse(): Response {
  return jsonOk([
    { id: 1, name: { nl: "genre", en: "genre", fr: "genre" } },
    { id: 2, name: { nl: "tag", en: "tag", fr: "tag" } },
  ]);
}

// ---------------------------------------------------------------------------
// Shared mock builder
// ---------------------------------------------------------------------------

type UrlHandler = (url: string, method: string) => Response | null;

/**
 * Registers a `fetch` spy that walks through handlers in order.
 * The first handler returning a non-null value wins; falls back to `jsonOk({})`.
 */
function mockFetch(...handlers: UrlHandler[]): void {
  vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    const method = (init?.method ?? "GET").toUpperCase();

    for (const handler of handlers) {
      const result = handler(url, method);
      if (result !== null) return result;
    }

    return jsonOk({});
  });
}

/** Returns all URLs that `fetch` was called with in the current test. */
function fetchedUrls(): string[] {
  return (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map(
    (args: unknown[]) => {
      const input = args[0] as RequestInfo;
      return typeof input === "string" ? input : (input as Request).url;
    },
  );
}

/** Returns all `fetch` calls for `/api/v1/production` with the given HTTP method. */
function fetchCallsWithMethod(method: string): unknown[][] {
  return (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
    (args: unknown[]) => {
      const input = args[0] as RequestInfo;
      const init = args[1] as RequestInit | undefined;
      const url = typeof input === "string" ? input : (input as Request).url;
      return (
        url.endsWith("/api/v1/production") &&
        (init?.method ?? "GET").toUpperCase() === method
      );
    },
  );
}

// ---------------------------------------------------------------------------
// Common handler factories
// ---------------------------------------------------------------------------

const handleJwt: UrlHandler = (url) =>
  url.includes("/api/token/scraper") ? jwtResponse() : null;

const handleTagTypes: UrlHandler = (url) =>
  url.includes("/api/v1/tag/type") ? tagTypesResponse() : null;

const handleNotFoundLocally: UrlHandler = (url) =>
  url.includes("/api/v1/production?") ? notFoundLocally() : null;

const handleLocalLookupFails: UrlHandler = (url) =>
  url.includes("/api/v1/production?")
    ? textResponse("Internal Server Error", 500)
    : null;

const handleFoundLocally =
  (id = 999): UrlHandler =>
    (url) =>
      url.includes("/api/v1/production?") ? foundLocally(id) : null;

const handleRemoteProduction =
  (production: ProductionJSON = BASE_PRODUCTION): UrlHandler =>
    (url, method) =>
      url.includes("/productions/123") && method === "GET" ? jsonOk(production) : null;

const handleRemote404: UrlHandler = (url) =>
  url.includes("/productions/123") ? textResponse("Not found", 404) : null;

const handleRemote500: UrlHandler = (url) =>
  url.includes("/productions/123") ? textResponse("Server error", 500) : null;

const handleCreateOk =
  (id = 555): UrlHandler =>
    (url, method) =>
      url.endsWith("/api/v1/production") && method === "POST" ? jsonOk({ id }, 201) : null;

const handleCreateFail: UrlHandler = (url, method) =>
  url.endsWith("/api/v1/production") && method === "POST"
    ? textResponse("Bad request", 400)
    : null;

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// hasImportableProductionTitle
// ---------------------------------------------------------------------------

describe("hasImportableProductionTitle", () => {
  it("returns true when title has a valid nl entry", () => {
    expect(
      hasImportableProductionTitle({
        "@id": "/api/v1/productions/1",
        title: { nl: "De Voorstelling" },
      }),
    ).toBe(true);
  });

  it("falls back to meta_title when title is absent", () => {
    expect(
      hasImportableProductionTitle({
        "@id": "/api/v1/productions/2",
        meta_title: { en: "Some Show" },
      }),
    ).toBe(true);
  });

  it("falls back to artist when title and meta_title are absent", () => {
    expect(
      hasImportableProductionTitle({
        "@id": "/api/v1/productions/3",
        artist: { nl: "Kunstenaar" },
      }),
    ).toBe(true);
  });

  it("returns false when all three fields are absent", () => {
    expect(
      hasImportableProductionTitle({ "@id": "/api/v1/productions/4" }),
    ).toBe(false);
  });

  it("returns false when all three maps are empty objects", () => {
    expect(
      hasImportableProductionTitle({
        "@id": "/api/v1/productions/5",
        title: {},
        meta_title: {},
        artist: {},
      }),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// scrapeProductionById
// ---------------------------------------------------------------------------

describe("scrapeProductionById", () => {
  it("returns existing production id when already imported (no stats)", async () => {
    mockFetch(handleFoundLocally(999));

    expect(await scrapeProductionById(123, "auth", "jwt")).toBe(999);
  });

  it("increments reusedExisting stat when production already exists locally", async () => {
    mockFetch(handleFoundLocally(999));

    const stats = {
      productions: { reusedExisting: 0, created: 0 },
      tags: {},
    } as ScrapeRunStats;

    await scrapeProductionById(123, "auth", "jwt", stats);

    expect(stats.productions.reusedExisting).toBe(1);
  });

  it("throws when the local production lookup itself returns a non-ok status", async () => {
    mockFetch(handleLocalLookupFails);

    await expect(scrapeProductionById(123, "auth", "jwt")).rejects.toThrow(
      "Failed to fetch production from own api",
    );
  });

  it("throws when duplicate local productions exist for the same old_id", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      jsonOk({ items: [{ id: 1 }, { id: 2 }], total: 2 }),
    );

    await expect(scrapeProductionById(123, "auth", "jwt")).rejects.toThrow(
      "Multiple productions found with old_id 123",
    );
  });

  it("returns null when remote production is 404", async () => {
    mockFetch(handleNotFoundLocally, handleRemote404);

    expect(await scrapeProductionById(123, "auth", "jwt")).toBeNull();
  });

  it("returns null on non-404 remote fetch failure", async () => {
    mockFetch(handleNotFoundLocally, handleRemote500);

    expect(await scrapeProductionById(123, "auth", "jwt")).toBeNull();
  });

  it("returns null when remote production has no importable title", async () => {
    mockFetch(
      handleNotFoundLocally,
      handleRemoteProduction({ "@id": "/api/v1/productions/123" }),
    );

    expect(await scrapeProductionById(123, "auth", "jwt")).toBeNull();
  });

  it("creates a production successfully and returns its new id", async () => {
    mockFetch(handleNotFoundLocally, handleRemoteProduction(), handleCreateOk(555));

    expect(await scrapeProductionById(123, "auth", "jwt")).toBe(555);
  });

  it("increments created stat when production is created", async () => {
    mockFetch(handleNotFoundLocally, handleRemoteProduction(), handleCreateOk(555));

    const stats = {
      productions: { reusedExisting: 0, created: 0 },
      tags: {},
    } as ScrapeRunStats;

    await scrapeProductionById(123, "auth", "jwt", stats);

    expect(stats.productions.created).toBe(1);
  });

  it("returns null when local POST fails", async () => {
    mockFetch(handleNotFoundLocally, handleRemoteProduction(), handleCreateFail);

    expect(await scrapeProductionById(123, "auth", "jwt")).toBeNull();
  });

  it("processes galleries (string IRI, object IRI, absent) on successful create", async () => {
    // Exercises all three extractGalleryIri branches: string, { "@id": string }, undefined
    mockFetch(
      handleNotFoundLocally,
      handleRemoteProduction(PRODUCTION_WITH_GALLERIES),
      handleCreateOk(555),
    );

    expect(await scrapeProductionById(123, "auth", "jwt")).toBe(555);
  });

  it("fetches its own JWT when loginToken is omitted", async () => {
    mockFetch(handleNotFoundLocally, handleJwt, handleRemoteProduction(), handleCreateOk(555));

    expect(await scrapeProductionById(123, "auth")).toBe(555);
  });
});

// ---------------------------------------------------------------------------
// scrapeAllProductions
// ---------------------------------------------------------------------------

describe("scrapeAllProductions", () => {
  it("processes a single page with one production", async () => {
    mockFetch(
      handleJwt,
      handleTagTypes,
      (url) =>
        url.includes("/api/v1/productions?page=1")
          ? jsonOk({
            totalItems: 1,
            member: [BASE_PRODUCTION],
            view: { last: "/api/v1/productions?page=1" },
          })
          : null,
      handleNotFoundLocally,
      handleCreateOk(999),
    );

    await expect(scrapeAllProductions("auth")).resolves.toBeUndefined();
  });

  it("processes multiple pages, visiting each page in order", async () => {
    mockFetch(
      handleJwt,
      handleTagTypes,
      (url) => {
        if (url.includes("/api/v1/productions?page=1")) {
          return jsonOk({
            totalItems: 2,
            member: [BASE_PRODUCTION],
            view: { last: "/api/v1/productions?page=2" },
          });
        }
        if (url.includes("/api/v1/productions?page=2")) {
          return jsonOk({
            totalItems: 2,
            member: [{ "@id": "/api/v1/productions/456", title: { nl: "Other" } }],
            view: { last: "/api/v1/productions?page=2" },
          });
        }
        return null;
      },
      (url) => (url.includes("/api/v1/production?") ? notFoundLocally() : null),
      handleCreateOk(999),
    );

    await expect(scrapeAllProductions("auth")).resolves.toBeUndefined();

    expect(fetchedUrls().some((u) => u.includes("page=2"))).toBe(true);
  });

  it("skips creating a production that already exists and syncs its genre tags", async () => {
    mockFetch(
      handleJwt,
      handleTagTypes,
      (url) =>
        url.includes("/api/v1/productions?page=1")
          ? jsonOk({
            totalItems: 1,
            member: [BASE_PRODUCTION],
            view: { last: "/api/v1/productions?page=1" },
          })
          : null,
      (url) => (url.includes("/api/v1/production?") ? foundLocally(42) : null),
    );

    await expect(scrapeAllProductions("auth")).resolves.toBeUndefined();

    expect(fetchCallsWithMethod("POST")).toHaveLength(0);
  });

  it("skips production with no importable title during crawl", async () => {
    mockFetch(
      handleJwt,
      handleTagTypes,
      (url) =>
        url.includes("/api/v1/productions?page=1")
          ? jsonOk({
            totalItems: 1,
            member: [{ "@id": "/api/v1/productions/789" }],
            view: { last: "/api/v1/productions?page=1" },
          })
          : null,
      handleNotFoundLocally,
    );

    await expect(scrapeAllProductions("auth")).resolves.toBeUndefined();
  });

  it("skips production with non-parseable @id during crawl", async () => {
    // Exercises the !Number.isFinite(oldId) branch in ensureProductionImported
    mockFetch(
      handleJwt,
      handleTagTypes,
      (url) =>
        url.includes("/api/v1/productions?page=1")
          ? jsonOk({
            totalItems: 1,
            member: [{ "@id": "/api/v1/productions/not-a-number", title: { nl: "Show" } }],
            view: { last: "/api/v1/productions?page=1" },
          })
          : null,
    );

    await expect(scrapeAllProductions("auth")).resolves.toBeUndefined();
  });

  it("processes galleries for an existing production during full crawl", async () => {
    mockFetch(
      handleJwt,
      handleTagTypes,
      (url) =>
        url.includes("/api/v1/productions?page=1")
          ? jsonOk({
            totalItems: 1,
            member: [PRODUCTION_WITH_GALLERIES],
            view: { last: "/api/v1/productions?page=1" },
          })
          : null,
      (url) => (url.includes("/api/v1/production?") ? foundLocally(42) : null),
    );

    await expect(scrapeAllProductions("auth")).resolves.toBeUndefined();
  });
});