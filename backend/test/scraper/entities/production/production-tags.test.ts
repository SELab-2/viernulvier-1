import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import type {
  syncProductionGenreTagsWithPayload as SyncWithPayload,
  syncProductionGenreTagsFromViernulvier as SyncFromViernulvier,
  rememberViernulvierProductionJson as RememberProduction,
  ProductionDocumentForTags,
} from "@/scraper/entities/production/production-tags.js";
import { createEmptyRunStats } from "@/scraper/core/scrape-stats.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonOk(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function textResponse(body: string, status: number): Response {
  return new Response(body, { status });
}

/** Two tag-type rows that satisfy loadOrCreateTagTypes without any POSTs. */
const TAG_TYPE_GENRE = { id: 10, name: { nl: "genre", en: "genre", fr: "genre" } };
const TAG_TYPE_TAG = { id: 20, name: { nl: "tag", en: "tag", fr: "tag" } };
const BOTH_TAG_TYPES = [TAG_TYPE_GENRE, TAG_TYPE_TAG];

/** A well-formed Viernulvier genre JSON. */
function genreJson(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    "@id": "/api/v1/genres/5",
    use_as: "genre",
    name: { nl: "Jazz", en: "Jazz", fr: "Jazz" },
    ...overrides,
  };
}

/** A production document that references one genre IRI. */
function productionWithGenre(
  prodId: number,
  genreIri = "/api/v1/genres/5",
): ProductionDocumentForTags {
  return {
    "@id": `/api/v1/productions/${prodId}`,
    genres: [genreIri],
  };
}

// ---------------------------------------------------------------------------
// Module reset — tagTypeIdsPromise is a module-level singleton, so we must
// re-import the module fresh for each test to avoid cross-test cache pollution.
// ---------------------------------------------------------------------------

let syncWithPayload: typeof SyncWithPayload;
let syncFromViernulvier: typeof SyncFromViernulvier;
let rememberProduction: typeof RememberProduction;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import("@/scraper/entities/production/production-tags.js");
  syncWithPayload = mod.syncProductionGenreTagsWithPayload;
  syncFromViernulvier = mod.syncProductionGenreTagsFromViernulvier;
  rememberProduction = mod.rememberViernulvierProductionJson;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// loadOrCreateTagTypes — GET fails
// ---------------------------------------------------------------------------

describe("loadOrCreateTagTypes — GET /tag/type fails", () => {
  it("throws when the tag-type list endpoint returns non-OK", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(textResponse("Server Error", 500));

    const stats = createEmptyRunStats();
    await expect(
      syncWithPayload(1, { "@id": "/api/v1/productions/1" }, "auth", "login", stats),
    ).rejects.toThrow("GET /tag/type failed");
  });
});

// ---------------------------------------------------------------------------
// loadOrCreateTagTypes — both types already exist (no POSTs)
// ---------------------------------------------------------------------------

describe("loadOrCreateTagTypes — both tag types already exist", () => {
  it("does not POST tag types when both are found in the GET response", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(jsonOk(BOTH_TAG_TYPES));

    const stats = createEmptyRunStats();
    await syncWithPayload(1, { "@id": "/api/v1/productions/1" }, "auth", "login", stats);

    const postCalls = fetchSpy.mock.calls.filter(
      ([, init]) => init?.method === "POST",
    );
    expect(postCalls).toHaveLength(0);
    expect(stats.tags.tagTypesCreated).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// loadOrCreateTagTypes — one type missing → POST it
// ---------------------------------------------------------------------------

describe("loadOrCreateTagTypes — one tag type missing", () => {
  it("creates the missing tag type and increments tagTypesCreated", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method ?? "GET";

      if (url.includes("/tag/type") && method === "GET") {
        // Only "genre" exists; "tag" is missing.
        return jsonOk([TAG_TYPE_GENRE]);
      }
      if (url.includes("/tag/type") && method === "POST") {
        return jsonOk({ id: 21, name: { nl: "tag", en: "tag", fr: "tag" } }, 201);
      }
      return jsonOk(BOTH_TAG_TYPES);
    });

    const stats = createEmptyRunStats();
    await syncWithPayload(1, { "@id": "/api/v1/productions/1" }, "auth", "login", stats);

    expect(stats.tags.tagTypesCreated).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// loadOrCreateTagTypes — POST tag type fails
// ---------------------------------------------------------------------------

describe("loadOrCreateTagTypes — POST /tag/type fails", () => {
  it("throws when creating a missing tag type returns non-OK", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method ?? "GET";

      if (url.includes("/tag/type") && method === "GET") return jsonOk([]);
      if (url.includes("/tag/type") && method === "POST") return textResponse("Conflict", 409);
      return jsonOk([]);
    });

    await expect(
      syncWithPayload(1, { "@id": "/api/v1/productions/1" }, "auth", "login"),
    ).rejects.toThrow("POST /tag/type");
  });
});

// ---------------------------------------------------------------------------
// tagTypeIdsPromise — singleton is reused on second call
// ---------------------------------------------------------------------------

describe("tagTypeIdsPromise — module-level cache", () => {
  it("only calls GET /tag/type once across two syncs", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      if (url.includes("/tag/type") && method === "GET") return jsonOk(BOTH_TAG_TYPES);
      return jsonOk([]);
    });

    await syncWithPayload(1, { "@id": "/api/v1/productions/1" }, "auth", "login");
    await syncWithPayload(2, { "@id": "/api/v1/productions/2" }, "auth", "login");

    const tagTypeGets = fetchSpy.mock.calls.filter(
      ([url]) => typeof url === "string" && url.includes("/tag/type"),
    );
    expect(tagTypeGets).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// normalizeGenresField — null, single object, array
// ---------------------------------------------------------------------------

describe("normalizeGenresField — genres field shapes", () => {
  function mockTagTypes() {
    vi.spyOn(global, "fetch").mockResolvedValue(jsonOk(BOTH_TAG_TYPES));
  }

  it("handles genres: undefined (no iterations)", async () => {
    mockTagTypes();
    const stats = createEmptyRunStats();
    await syncWithPayload(1, { "@id": "/api/v1/productions/1" }, "auth", "login", stats);
    expect(stats.tags.genresSkipped).toBe(0);
  });

  it("handles genres: null (treated as empty)", async () => {
    mockTagTypes();
    const stats = createEmptyRunStats();
    await syncWithPayload(
      1,
      { "@id": "/api/v1/productions/1", genres: null as unknown as undefined },
      "auth",
      "login",
      stats,
    );
    expect(stats.tags.genresSkipped).toBe(0);
  });

  it("handles genres as a single non-array IRI string", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      if (url.includes("/tag/type") && method === "GET") return jsonOk(BOTH_TAG_TYPES);
      // Genre fetch → 404 so we get a clean genresSkipped increment
      if (url.includes("/genres/")) return textResponse("Not Found", 404);
      return jsonOk([]);
    });

    const stats = createEmptyRunStats();
    await syncWithPayload(
      1,
      { "@id": "/api/v1/productions/1", genres: "/api/v1/genres/5" },
      "auth",
      "login",
      stats,
    );
    expect(stats.tags.genresSkipped).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// genre IRI parsing — null IRI and bad IRI path
// ---------------------------------------------------------------------------

describe("syncProductionGenreTagsInner — IRI parsing", () => {
  it("skips and increments genresSkipped when genre ref has no IRI", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      if (url.includes("/tag/type") && method === "GET") return jsonOk(BOTH_TAG_TYPES);
      return jsonOk([]);
    });

    const stats = createEmptyRunStats();
    // An object with no @id — hydraIriString returns null
    await syncWithPayload(
      1,
      { "@id": "/api/v1/productions/1", genres: [{ not_an_id: true }] },
      "auth",
      "login",
      stats,
    );
    expect(stats.tags.genresSkipped).toBe(1);
  });

  it("skips when IRI does not match /genres/{id} pattern", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      if (url.includes("/tag/type") && method === "GET") return jsonOk(BOTH_TAG_TYPES);
      return jsonOk([]);
    });

    const stats = createEmptyRunStats();
    await syncWithPayload(
      1,
      { "@id": "/api/v1/productions/1", genres: ["/api/v1/not-genres/abc"] },
      "auth",
      "login",
      stats,
    );
    expect(stats.tags.genresSkipped).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// fetchViernulvierGenreJson — 404, non-ok, cache hit
// ---------------------------------------------------------------------------

describe("fetchViernulvierGenreJson", () => {
  it("skips genre when Viernulvier returns 404", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      if (url.includes("/tag/type") && method === "GET") return jsonOk(BOTH_TAG_TYPES);
      if (url.includes("/genres/")) return textResponse("Not Found", 404);
      return jsonOk([]);
    });

    const stats = createEmptyRunStats();
    await syncWithPayload(1, productionWithGenre(1), "auth", "login", stats);
    expect(stats.tags.genresSkipped).toBe(1);
  });

  it("skips genre when Viernulvier returns non-404 error", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      if (url.includes("/tag/type") && method === "GET") return jsonOk(BOTH_TAG_TYPES);
      if (url.includes("/genres/")) return textResponse("Server Error", 500);
      return jsonOk([]);
    });

    const stats = createEmptyRunStats();
    await syncWithPayload(1, productionWithGenre(1), "auth", "login", stats);
    expect(stats.tags.genresSkipped).toBe(1);
  });

  it("uses the in-memory cache on a second call for the same genre", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      if (url.includes("/tag/type") && method === "GET") return jsonOk(BOTH_TAG_TYPES);
      if (url.includes("/genres/")) return jsonOk(genreJson());
      if (url.includes("/tag/all")) return jsonOk([{ id: 99 }]);
      if (url.includes("/production/") && url.includes("/tags")) return jsonOk({ linked: true });
      return jsonOk([]);
    });

    // Two productions referencing the same genre old_id=5
    await syncWithPayload(1, productionWithGenre(1, "/api/v1/genres/5"), "auth", "login");
    await syncWithPayload(2, productionWithGenre(2, "/api/v1/genres/5"), "auth", "login");

    const genreFetches = fetchSpy.mock.calls.filter(
      ([url]) => typeof url === "string" && url.includes("/genres/5"),
    );
    expect(genreFetches).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// normalizeUseAs — invalid use_as
// ---------------------------------------------------------------------------

describe("normalizeUseAs — invalid use_as value", () => {
  it("skips genre when use_as is not 'genre' or 'tag'", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      if (url.includes("/tag/type") && method === "GET") return jsonOk(BOTH_TAG_TYPES);
      if (url.includes("/genres/")) return jsonOk(genreJson({ use_as: "unknown_type" }));
      return jsonOk([]);
    });

    const stats = createEmptyRunStats();
    await syncWithPayload(1, productionWithGenre(1), "auth", "login", stats);
    expect(stats.tags.genresSkipped).toBe(1);
  });

  it("skips genre when use_as is missing", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      if (url.includes("/tag/type") && method === "GET") return jsonOk(BOTH_TAG_TYPES);
      if (url.includes("/genres/")) return jsonOk(genreJson({ use_as: undefined }));
      return jsonOk([]);
    });

    const stats = createEmptyRunStats();
    await syncWithPayload(1, productionWithGenre(1), "auth", "login", stats);
    expect(stats.tags.genresSkipped).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// nameMapForGenre — no name and no vendor_id → null
// ---------------------------------------------------------------------------

describe("nameMapForGenre — no usable name", () => {
  it("skips genre when both name and vendor_id are absent", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      if (url.includes("/tag/type") && method === "GET") return jsonOk(BOTH_TAG_TYPES);
      if (url.includes("/genres/"))
        return jsonOk({ "@id": "/api/v1/genres/5", use_as: "genre" }); // no name, no vendor_id
      return jsonOk([]);
    });

    const stats = createEmptyRunStats();
    await syncWithPayload(1, productionWithGenre(1), "auth", "login", stats);
    expect(stats.tags.genresSkipped).toBe(1);
  });

  it("uses vendor_id as fallback name when name map is absent", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      if (url.includes("/tag/type") && method === "GET") return jsonOk(BOTH_TAG_TYPES);
      if (url.includes("/genres/"))
        return jsonOk({ "@id": "/api/v1/genres/5", use_as: "genre", vendor_id: "jazz" });
      if (url.includes("/tag/all")) return jsonOk([]);
      if (url.includes("/api/v1/tag") && method === "POST") return jsonOk({ id: 55 }, 201);
      if (url.includes("/production/") && url.includes("/tags")) return jsonOk({ linked: true });
      return jsonOk([]);
    });

    const stats = createEmptyRunStats();
    await syncWithPayload(1, productionWithGenre(1), "auth", "login", stats);

    // Tag should have been created using vendor_id as the name
    const tagPost = fetchSpy.mock.calls.find(
      ([url, init]) =>
        typeof url === "string" && url.includes("/api/v1/tag") && !url.includes("/type") && !url.includes("/all") && init?.method === "POST",
    );
    expect(tagPost).toBeDefined();
    const body = JSON.parse((tagPost![1] as RequestInit).body as string);
    expect(body.name.nl).toBe("jazz");
  });

  it("falls back to vendor_id when localized names sanitize to empty", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = init?.method ?? "GET";

      if (url.includes("/tag/type") && method === "GET") {
        return jsonOk(BOTH_TAG_TYPES);
      }

      if (url.includes("/genres/")) {
        return jsonOk({
          "@id": "/api/v1/genres/5",
          use_as: "genre",
          name: {
            nl: "<p>   </p>",
            en: "",
            fr: "",
          },
          vendor_id: "fallback-name",
        });
      }

      if (url.includes("/tag/all")) return jsonOk([]);

      if (
        url.includes("/api/v1/tag") &&
        !url.includes("/type") &&
        !url.includes("/all") &&
        method === "POST"
      ) {
        return jsonOk({ id: 55 }, 201);
      }

      if (url.includes("/production/") && url.includes("/tags")) {
        return jsonOk({ linked: true });
      }

      return jsonOk([]);
    });

    await syncWithPayload(1, productionWithGenre(1), "auth", "login");

    const tagPost = fetchSpy.mock.calls.find(
      ([url, init]) =>
        typeof url === "string" &&
        url.includes("/api/v1/tag") &&
        !url.includes("/type") &&
        !url.includes("/all") &&
        init?.method === "POST",
    );

    const body = JSON.parse((tagPost![1] as RequestInit).body as string);

    expect(body.name.nl).toBe("fallback-name");
  });
});

// ---------------------------------------------------------------------------
// resolveLocalTagIdForGenre — cache hit, existing, create fails
// ---------------------------------------------------------------------------

describe("resolveLocalTagIdForGenre", () => {
  it("reuses cached tag id on second call for same genre+type", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      if (url.includes("/tag/type") && method === "GET") return jsonOk(BOTH_TAG_TYPES);
      if (url.includes("/genres/")) return jsonOk(genreJson());
      if (url.includes("/tag/all")) return jsonOk([{ id: 77 }]);
      if (url.includes("/production/") && url.includes("/tags")) return jsonOk({ linked: true });
      return jsonOk([]);
    });

    // Two different productions with the same genre
    await syncWithPayload(1, productionWithGenre(1, "/api/v1/genres/5"), "auth", "login");
    await syncWithPayload(2, productionWithGenre(2, "/api/v1/genres/5"), "auth", "login");

    const tagAllCalls = fetchSpy.mock.calls.filter(
      ([url]) => typeof url === "string" && url.includes("/tag/all"),
    );
    // Second call should use cache — only one /tag/all fetch
    expect(tagAllCalls).toHaveLength(1);
  });

  it("increments tagsReusedExisting when tag already exists locally", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      if (url.includes("/tag/type") && method === "GET") return jsonOk(BOTH_TAG_TYPES);
      if (url.includes("/genres/")) return jsonOk(genreJson());
      if (url.includes("/tag/all")) return jsonOk([{ id: 77 }]);
      if (url.includes("/production/") && url.includes("/tags")) return jsonOk({ linked: true });
      return jsonOk([]);
    });

    const stats = createEmptyRunStats();
    await syncWithPayload(1, productionWithGenre(1), "auth", "login", stats);
    expect(stats.tags.tagsReusedExisting).toBe(1);
    expect(stats.tags.tagsCreated).toBe(0);
  });

  it("increments tagsCreated when a new tag is created", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      if (url.includes("/tag/type") && method === "GET") return jsonOk(BOTH_TAG_TYPES);
      if (url.includes("/genres/")) return jsonOk(genreJson());
      if (url.includes("/tag/all")) return jsonOk([]);
      if (url.includes("/api/v1/tag") && !url.includes("/type") && !url.includes("/all") && method === "POST")
        return jsonOk({ id: 88 }, 201);
      if (url.includes("/production/") && url.includes("/tags")) return jsonOk({ linked: true });
      return jsonOk([]);
    });

    const stats = createEmptyRunStats();
    await syncWithPayload(1, productionWithGenre(1), "auth", "login", stats);
    expect(stats.tags.tagsCreated).toBe(1);
    expect(stats.tags.tagsReusedExisting).toBe(0);
  });

  it("skips and increments genresSkipped when tag creation returns non-OK", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      if (url.includes("/tag/type") && method === "GET") return jsonOk(BOTH_TAG_TYPES);
      if (url.includes("/genres/")) return jsonOk(genreJson());
      if (url.includes("/tag/all")) return jsonOk([]);
      if (url.includes("/api/v1/tag") && !url.includes("/type") && !url.includes("/all") && method === "POST")
        return textResponse("Conflict", 409);
      return jsonOk([]);
    });

    const stats = createEmptyRunStats();
    await syncWithPayload(1, productionWithGenre(1), "auth", "login", stats);
    expect(stats.tags.genresSkipped).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// findLocalTagByOldIdAndType — non-ok response
// ---------------------------------------------------------------------------

describe("findLocalTagByOldIdAndType — non-OK response", () => {
  it("returns null (and does not throw) when GET /tag/all returns non-OK", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      if (url.includes("/tag/type") && method === "GET") return jsonOk(BOTH_TAG_TYPES);
      if (url.includes("/genres/")) return jsonOk(genreJson());
      if (url.includes("/tag/all")) return textResponse("Server Error", 500);
      // Falls through to tag creation
      if (url.includes("/api/v1/tag") && !url.includes("/type") && !url.includes("/all") && method === "POST")
        return jsonOk({ id: 99 }, 201);
      if (url.includes("/production/") && url.includes("/tags")) return jsonOk({ linked: true });
      return jsonOk([]);
    });

    const stats = createEmptyRunStats();
    await syncWithPayload(1, productionWithGenre(1), "auth", "login", stats);
    // Tag creation should have proceeded after the failed lookup
    expect(stats.tags.tagsCreated).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// linkProductionToTag — fails and already-present
// ---------------------------------------------------------------------------

describe("linkProductionToTag", () => {
  it("increments genresSkipped when the tag-link POST fails", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      if (url.includes("/tag/type") && method === "GET") return jsonOk(BOTH_TAG_TYPES);
      if (url.includes("/genres/")) return jsonOk(genreJson());
      if (url.includes("/tag/all")) return jsonOk([{ id: 77 }]);
      if (url.includes("/production/") && url.includes("/tags"))
        return textResponse("Server Error", 500);
      return jsonOk([]);
    });

    const stats = createEmptyRunStats();
    await syncWithPayload(1, productionWithGenre(1), "auth", "login", stats);
    expect(stats.tags.genresSkipped).toBe(1);
    expect(stats.tags.linksCreated).toBe(0);
  });

  it("increments linksCreated when the link POST succeeds with linked: true", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      if (url.includes("/tag/type") && method === "GET") return jsonOk(BOTH_TAG_TYPES);
      if (url.includes("/genres/")) return jsonOk(genreJson());
      if (url.includes("/tag/all")) return jsonOk([{ id: 77 }]);
      if (url.includes("/production/") && url.includes("/tags")) return jsonOk({ linked: true });
      return jsonOk([]);
    });

    const stats = createEmptyRunStats();
    await syncWithPayload(1, productionWithGenre(1), "auth", "login", stats);
    expect(stats.tags.linksCreated).toBe(1);
    expect(stats.tags.linksAlreadyPresent).toBe(0);
  });

  it("increments linksAlreadyPresent when the link POST returns linked: false", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      if (url.includes("/tag/type") && method === "GET") return jsonOk(BOTH_TAG_TYPES);
      if (url.includes("/genres/")) return jsonOk(genreJson());
      if (url.includes("/tag/all")) return jsonOk([{ id: 77 }]);
      if (url.includes("/production/") && url.includes("/tags")) return jsonOk({ linked: false });
      return jsonOk([]);
    });

    const stats = createEmptyRunStats();
    await syncWithPayload(1, productionWithGenre(1), "auth", "login", stats);
    expect(stats.tags.linksAlreadyPresent).toBe(1);
    expect(stats.tags.linksCreated).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// syncProductionGenreTagsFromViernulvier — production fetch fails / cache hit
// ---------------------------------------------------------------------------

describe("syncProductionGenreTagsFromViernulvier", () => {
  it("returns without processing when Viernulvier production fetch fails", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      if (url.includes("/tag/type") && method === "GET") return jsonOk(BOTH_TAG_TYPES);
      if (url.includes("/productions/")) return textResponse("Not Found", 404);
      return jsonOk([]);
    });

    const stats = createEmptyRunStats();
    await syncFromViernulvier(99, 1, "auth", "login", stats);
    expect(stats.tags.genresSkipped).toBe(0);
    expect(stats.tags.linksCreated).toBe(0);
  });

  it("uses the in-memory cache warmed by rememberViernulvierProductionJson", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      if (url.includes("/tag/type") && method === "GET") return jsonOk(BOTH_TAG_TYPES);
      // No productions/ fetch should happen
      if (url.includes("/productions/")) throw new Error("Should not fetch production");
      return jsonOk([]);
    });

    rememberProduction(42, { "@id": "/api/v1/productions/42" });
    await syncFromViernulvier(42, 1, "auth", "login");

    const productionFetches = fetchSpy.mock.calls.filter(
      ([url]) => typeof url === "string" && url.includes("/productions/"),
    );
    expect(productionFetches).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// rememberViernulvierProductionJson — warms cache used by syncWithPayload
// ---------------------------------------------------------------------------

describe("rememberViernulvierProductionJson", () => {
  it("stores production so syncWithPayload does not need to re-parse @id for caching", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(jsonOk(BOTH_TAG_TYPES));

    const production = { "@id": "/api/v1/productions/7" };
    rememberProduction(7, production);

    const stats = createEmptyRunStats();
    await expect(
      syncWithPayload(1, production, "auth", "login", stats),
    ).resolves.toBeUndefined();
  });

  it("does not cache when @id segment is not a finite number", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(jsonOk(BOTH_TAG_TYPES));

    const production = { "@id": "/api/v1/productions/not-a-number" };
    // Should not throw — just skips caching
    await expect(
      syncWithPayload(1, production, "auth", "login"),
    ).resolves.toBeUndefined();
  });
});