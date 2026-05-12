import { describe, expect, it, vi, afterEach } from "vitest";

import {
  scrapeHallById,
  fetchLocalHallIdByOldId,
  resolveAddressForViernulvierHallJson,
  scrapeAllHalls,
  type HallJSON,
} from "@/scraper/entities/hall/hall.js";
import type { ScrapeRunStats } from "@/scraper/core/scrape-stats.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function textResponse(body: string, status: number): Response {
  return new Response(body, { status });
}

/** Build a minimal HallJSON fixture. */
function hallJson(overrides: Partial<HallJSON> = {}): HallJSON {
  return {
    "@id": "/api/v1/halls/1",
    name: "Test Hall",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// fetchLocalHallIdByOldId
// ---------------------------------------------------------------------------

describe("fetchLocalHallIdByOldId", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns null when the local API returns an empty array", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(jsonResponse([]));
    expect(await fetchLocalHallIdByOldId(99)).toBeNull();
  });

  it("returns the id when exactly one hall is found", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      jsonResponse([{ id: 7, old_id: 99, name: "Grote Zaal" }]),
    );
    expect(await fetchLocalHallIdByOldId(99)).toBe(7);
  });

  it("throws when more than one hall matches the same old_id", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      jsonResponse([
        { id: 1, old_id: 99, name: "Hall A" },
        { id: 2, old_id: 99, name: "Hall B" },
      ]),
    );
    await expect(fetchLocalHallIdByOldId(99)).rejects.toThrow(
      "Multiple halls found with old_id 99",
    );
  });

  it("throws when the local API returns a non-OK status", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      textResponse("Internal Server Error", 500),
    );
    await expect(fetchLocalHallIdByOldId(99)).rejects.toThrow(
      "Failed to fetch hall from own api",
    );
  });

  it("includes the status code in the error message on failure", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      textResponse("Not Found", 404),
    );
    await expect(fetchLocalHallIdByOldId(42)).rejects.toThrow("404");
  });
});

// ---------------------------------------------------------------------------
// scrapeHallById — existence / early-return paths
// ---------------------------------------------------------------------------

describe("scrapeHallById — local cache hit", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns the existing local id without calling Viernulvier", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse([{ id: 7, old_id: 5, name: "Grote Zaal" }]));

    const id = await scrapeHallById(5, "auth-token");
    expect(id).toBe(7);
    // Only the local-check call should have fired — no Viernulvier request.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("increments stats.halls.reusedExisting when a local record is found", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      jsonResponse([{ id: 7, old_id: 5, name: "Grote Zaal" }]),
    );

    const stats = {
      halls: { created: 0, reusedExisting: 0 },
    } as ScrapeRunStats;

    await scrapeHallById(5, "auth-token", undefined, stats);
    expect(stats.halls.reusedExisting).toBe(1);
    expect(stats.halls.created).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// scrapeHallById — Viernulvier fetch failures
// ---------------------------------------------------------------------------

describe("scrapeHallById — Viernulvier fetch failures", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns null on a 404 from Viernulvier", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse([]))              // local check → not found
      .mockResolvedValueOnce(textResponse("Not Found", 404)); // Viernulvier 404

    expect(await scrapeHallById(999, "auth-token")).toBeNull();
  });

  it("returns null on any non-404 error from Viernulvier", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse([]))               // local check → not found
      .mockResolvedValueOnce(textResponse("Server Error", 500)); // Viernulvier 500

    expect(await scrapeHallById(999, "auth-token")).toBeNull();
  });

  it("returns null on a 503 from Viernulvier", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(textResponse("Service Unavailable", 503));

    expect(await scrapeHallById(42, "auth-token")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// scrapeHallById — hall creation
// ---------------------------------------------------------------------------

describe("scrapeHallById — hall creation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("creates and returns a new local hall id (no space field)", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse([]))                                     // local check
      .mockResolvedValueOnce(jsonResponse({ "@id": "/api/v1/halls/5", name: "Kleine Zaal" })) // Viernulvier
      .mockResolvedValueOnce(jsonResponse({ id: 55 }, 201));                      // local POST

    expect(await scrapeHallById(5, "auth-token", "login-token")).toBe(55);
  });

  it("increments stats.halls.created when a new hall is created", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ "@id": "/api/v1/halls/5", name: "Kleine Zaal" }))
      .mockResolvedValueOnce(jsonResponse({ id: 55 }, 201));

    const stats = { halls: { created: 0, reusedExisting: 0 } } as ScrapeRunStats;
    await scrapeHallById(5, "auth-token", "login-token", stats);
    expect(stats.halls.created).toBe(1);
  });

  it("returns null when the local POST fails", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse([]))                                     // local check
      .mockResolvedValueOnce(jsonResponse({ "@id": "/api/v1/halls/5", name: "Kleine Zaal" })) // Viernulvier
      .mockResolvedValueOnce(textResponse("Conflict", 409));                      // POST fails

    expect(await scrapeHallById(5, "auth-token", "login-token")).toBeNull();
  });

  it("does not increment stats.halls.created when POST fails", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ "@id": "/api/v1/halls/5", name: "Kleine Zaal" }))
      .mockResolvedValueOnce(textResponse("Conflict", 409));

    const stats = { halls: { created: 0, reusedExisting: 0 } } as ScrapeRunStats;
    await scrapeHallById(5, "auth-token", "login-token", stats);
    expect(stats.halls.created).toBe(0);
  });

  it("resolves space → location address and stores it on the created hall", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse([]))   // local check
      .mockResolvedValueOnce(                    // Viernulvier hall (has space IRI)
        jsonResponse({
          "@id": "/api/v1/halls/10",
          name: "Hall with Address",
          space: "/api/v1/spaces/3",
        }),
      )
      .mockResolvedValueOnce(                    // space fetch
        jsonResponse({ location: "/api/v1/locations/7" }),
      )
      .mockResolvedValueOnce(                    // location fetch
        jsonResponse({
          street: "Kortrijksesteenweg",
          number: "1",
          postal_code: "9000",
          city: "Gent",
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ id: 88 }, 201)); // POST

    const id = await scrapeHallById(10, "auth-token", "login-token");
    expect(id).toBe(88);

    // The POST body should contain the formatted address.
    const postCall = fetchSpy.mock.calls.find(
      ([, init]) => (init as RequestInit)?.method === "POST",
    );
    expect(postCall).toBeDefined();
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body.address).toBe("Kortrijksesteenweg 1, 9000 Gent");
  });

  it("creates hall with null address when space fetch fails", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(
        jsonResponse({ "@id": "/api/v1/halls/11", name: "No Address Hall", space: "/api/v1/spaces/99" }),
      )
      .mockResolvedValueOnce(textResponse("Not Found", 404)) // space fetch fails
      .mockResolvedValueOnce(jsonResponse({ id: 99 }, 201));

    await scrapeHallById(11, "auth-token", "login-token");

    const postCall = fetchSpy.mock.calls.find(
      ([, init]) => (init as RequestInit)?.method === "POST",
    );
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body.address).toBeNull();
  });

  it("creates hall with null address when space has no location IRI", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(
        jsonResponse({ "@id": "/api/v1/halls/12", name: "Spaceless Hall", space: "/api/v1/spaces/5" }),
      )
      .mockResolvedValueOnce(jsonResponse({ /* no location field */ })) // space with no location
      .mockResolvedValueOnce(jsonResponse({ id: 100 }, 201));

    await scrapeHallById(12, "auth-token", "login-token");

    const postCall = fetchSpy.mock.calls.find(
      ([, init]) => (init as RequestInit)?.method === "POST",
    );
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body.address).toBeNull();
  });

  it("creates hall with null address when location fetch fails", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(
        jsonResponse({ "@id": "/api/v1/halls/13", name: "Bad Loc Hall", space: "/api/v1/spaces/6" }),
      )
      .mockResolvedValueOnce(jsonResponse({ location: "/api/v1/locations/99" })) // space
      .mockResolvedValueOnce(textResponse("Not Found", 404))                     // location fails
      .mockResolvedValueOnce(jsonResponse({ id: 101 }, 201));

    await scrapeHallById(13, "auth-token", "login-token");

    const postCall = fetchSpy.mock.calls.find(
      ([, init]) => (init as RequestInit)?.method === "POST",
    );
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body.address).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// scrapeHallById — legacy id parsing
// ---------------------------------------------------------------------------

describe("scrapeHallById — @id parsing edge cases", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns null when Viernulvier returns a hall with an unparseable @id", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse([]))                               // local check
      .mockResolvedValueOnce(jsonResponse({ "@id": "/api/v1/halls/not-a-number", name: "Bad ID Hall" })) // Viernulvier
      // No POST mock needed — should bail out before POST.
    ;

    expect(await scrapeHallById(5, "auth-token", "login-token")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// scrapeHallById — space field as expanded JSON-LD object
// ---------------------------------------------------------------------------

describe("scrapeHallById — space as expanded JSON-LD object", () => {
  afterEach(() => vi.restoreAllMocks());

  it("resolves address when space is an expanded { '@id': '...' } object", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(
        jsonResponse({
          "@id": "/api/v1/halls/20",
          name: "Expanded Space Hall",
          space: { "@id": "/api/v1/spaces/8" },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ location: "/api/v1/locations/4" }))
      .mockResolvedValueOnce(
        jsonResponse({ street: "Veldstraat", number: "42", city: "Gent" }),
      )
      .mockResolvedValueOnce(jsonResponse({ id: 200 }, 201));

    await scrapeHallById(20, "auth-token", "login-token");

    const postCall = fetchSpy.mock.calls.find(
      ([, init]) => (init as RequestInit)?.method === "POST",
    );
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body.address).toBe("Veldstraat 42, Gent");
  });
});

// ---------------------------------------------------------------------------
// resolveAddressForViernulvierHallJson
// ---------------------------------------------------------------------------

describe("resolveAddressForViernulvierHallJson", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns null when hall has no space field", async () => {
    const result = await resolveAddressForViernulvierHallJson(
      hallJson({ space: undefined }),
      "auth-token",
    );
    expect(result).toBeNull();
  });

  it("returns a formatted address when the full chain resolves", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse({ location: "/api/v1/locations/1" })) // space
      .mockResolvedValueOnce(
        jsonResponse({ street: "Korenmarkt", number: "5", postal_code: "9000", city: "Gent" }),
      ); // location

    const result = await resolveAddressForViernulvierHallJson(
      hallJson({ space: "/api/v1/spaces/1" }),
      "auth-token",
    );
    expect(result).toBe("Korenmarkt 5, 9000 Gent");
  });

  it("returns null when the space fetch throws a network error", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network failure"));

    const result = await resolveAddressForViernulvierHallJson(
      hallJson({ space: "/api/v1/spaces/99" }),
      "auth-token",
    );
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Address formatting — via the full chain (observable through POST body)
// ---------------------------------------------------------------------------

describe("address formatting edge cases (via scrapeHallById)", () => {
  afterEach(() => vi.restoreAllMocks());

  /** Helper: stubs scrapeHallById fetch sequence for a hall that has a space with a given location payload. */
  let _counter = 3000; // responses are cached per id, so each id needs to be different
  async function scrapeWithLocation(
    locationPayload: Record<string, unknown>,
  ): Promise<string | null> {
    const uid = ++_counter;
    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(
        jsonResponse({ "@id": `/api/v1/halls/${uid}`, name: "Format Test", space: `/api/v1/spaces/${uid}` }),
      )
      .mockResolvedValueOnce(jsonResponse({ location: `/api/v1/locations/${uid}` }))
      .mockResolvedValueOnce(jsonResponse(locationPayload))
      .mockResolvedValueOnce(jsonResponse({ id: uid }, 201));

    await scrapeHallById(uid, "auth-token", "login-token");

    const postCall = fetchSpy.mock.calls.find(
      ([, init]) => (init as RequestInit)?.method === "POST",
    );
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    return body.address;
  }

  it("returns null when location has no street", async () => {
    const addr = await scrapeWithLocation({ city: "Gent" });
    expect(addr).toBeNull();
  });

  it("returns null when street is an empty string", async () => {
    const addr = await scrapeWithLocation({ street: "   ", city: "Gent" });
    expect(addr).toBeNull();
  });

  it("returns street only when city is absent", async () => {
    const addr = await scrapeWithLocation({ street: "Veldstraat" });
    expect(addr).toBe("Veldstraat");
  });

  it("appends street number when present and city is absent", async () => {
    const addr = await scrapeWithLocation({ street: "Veldstraat", number: "10" });
    expect(addr).toBe("Veldstraat 10");
  });

  it("formats street + city without postal code", async () => {
    const addr = await scrapeWithLocation({ street: "Veldstraat", city: "Gent" });
    expect(addr).toBe("Veldstraat, Gent");
  });

  it("formats full address: street + number + postal_code + city", async () => {
    const addr = await scrapeWithLocation({
      street: "Veldstraat",
      number: "1",
      postal_code: "9000",
      city: "Gent",
    });
    expect(addr).toBe("Veldstraat 1, 9000 Gent");
  });

  it("formats street + number + city without postal_code", async () => {
    const addr = await scrapeWithLocation({
      street: "Veldstraat",
      number: "1",
      city: "Gent",
    });
    expect(addr).toBe("Veldstraat 1, Gent");
  });

  it("trims whitespace from street and number", async () => {
    const addr = await scrapeWithLocation({
      street: "  Veldstraat  ",
      number: "  2  ",
      postal_code: "9000",
      city: "Gent",
    });
    expect(addr).toBe("Veldstraat 2, 9000 Gent");
  });
});

// ---------------------------------------------------------------------------
// Space address cache — same space IRI reused across two halls
// ---------------------------------------------------------------------------

describe("space address cache", () => {
  afterEach(() => vi.restoreAllMocks());

  it("does not re-fetch a space that was already resolved (cache hit)", async () => {
    // We run two independent scrapeHallById calls that share the same space IRI.
    // The space+location fetches should only occur once in total.
    const fetchSpy = vi.spyOn(global, "fetch")
      // --- first hall ---
      .mockResolvedValueOnce(jsonResponse([]))                // local check hall 40
      .mockResolvedValueOnce(
        jsonResponse({ "@id": "/api/v1/halls/40", name: "Hall 40", space: "/api/v1/spaces/50" }),
      )
      .mockResolvedValueOnce(jsonResponse({ location: "/api/v1/locations/60" })) // space 50
      .mockResolvedValueOnce(jsonResponse({ street: "Cached St", city: "Gent" })) // location 60
      .mockResolvedValueOnce(jsonResponse({ id: 400 }, 201))                     // POST hall 40
      // --- second hall ---
      .mockResolvedValueOnce(jsonResponse([]))                // local check hall 41
      .mockResolvedValueOnce(
        jsonResponse({ "@id": "/api/v1/halls/41", name: "Hall 41", space: "/api/v1/spaces/50" }),
      )
      // No space/location fetch expected here — should be cached.
      .mockResolvedValueOnce(jsonResponse({ id: 401 }, 201)); // POST hall 41

    await scrapeHallById(40, "auth-token", "login-token");
    await scrapeHallById(41, "auth-token", "login-token");

    // Space + location fetches should only have happened once.
    const spaceCalls = fetchSpy.mock.calls.filter(([url]) =>
      typeof url === "string" && url.includes("/spaces/"),
    );
    const locationCalls = fetchSpy.mock.calls.filter(([url]) =>
      typeof url === "string" && url.includes("/locations/"),
    );
    expect(spaceCalls).toHaveLength(1);
    expect(locationCalls).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Private function coverage via public entry points
// ---------------------------------------------------------------------------

describe("fetchPageRequest — non-OK response", () => {
  afterEach(() => vi.restoreAllMocks());

  it("throws when the halls list API returns a non-OK status", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse({ token: "jwt-token" })) // fetchScraperJwt
      .mockResolvedValueOnce(textResponse("Unauthorized", 401));   // fetchHallsListMeta → fetchPageRequest

    await expect(scrapeAllHalls("bad-auth-token")).rejects.toThrow("API returned status 401");
  });
});

describe("fetchSpaceLocation — catch branch", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns null and caches null when the space fetch throws a network error", async () => {
    // Use a fresh space IRI so the cache has no prior entry.
    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse([]))                          // local check
      .mockResolvedValueOnce(
        jsonResponse({ "@id": "/api/v1/halls/500", name: "Throw Hall", space: "/api/v1/spaces/500" }),
      )
      .mockRejectedValueOnce(new Error("Network failure"))             // space fetch throws
      .mockResolvedValueOnce(jsonResponse({ id: 500 }, 201));          // POST

    await scrapeHallById(500, "auth-token", "login-token");

    const postCall = fetchSpy.mock.calls.find(
      ([, init]) => (init as RequestInit)?.method === "POST",
    );
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body.address).toBeNull();
  });
});

describe("fetchLocationAddress — unreachable / catch branches", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns null when space location field is null", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(
        jsonResponse({ "@id": "/api/v1/halls/501", name: "Null Loc Hall", space: "/api/v1/spaces/501" }),
      )
      .mockResolvedValueOnce(jsonResponse({ location: null }))         // space has location: null
      .mockResolvedValueOnce(jsonResponse({ id: 501 }, 201));

    await scrapeHallById(501, "auth-token", "login-token");

    const postCall = fetchSpy.mock.calls.find(
      ([, init]) => (init as RequestInit)?.method === "POST",
    );
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body.address).toBeNull();
  });

  it("returns null when the location fetch throws a network error", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(
        jsonResponse({ "@id": "/api/v1/halls/502", name: "Throw Loc Hall", space: "/api/v1/spaces/502" }),
      )
      .mockResolvedValueOnce(jsonResponse({ location: "/api/v1/locations/502" })) // space ok
      .mockRejectedValueOnce(new Error("Network failure"))                        // location fetch throws
      .mockResolvedValueOnce(jsonResponse({ id: 502 }, 201));

    await scrapeHallById(502, "auth-token", "login-token");

    const postCall = fetchSpy.mock.calls.find(
      ([, init]) => (init as RequestInit)?.method === "POST",
    );
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body.address).toBeNull();
  });
});

describe("ensureHallImported — non-finite oldId", () => {
  afterEach(() => vi.restoreAllMocks());

  it("skips a hall whose @id segment cannot be parsed during a full crawl", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse({ token: "jwt-token" }))    // fetchScraperJwt
      .mockResolvedValueOnce(                                          // fetchHallsListMeta
        jsonResponse({
          totalItems: 1,
          view: { last: "/api/v1/halls?page=1" },
          member: [{ "@id": "/api/v1/halls/not-a-number", name: "Bad Hall" }],
        }),
      )
      .mockResolvedValueOnce(                                          // fetchHallsPage page 1
        jsonResponse({
          totalItems: 1,
          member: [{ "@id": "/api/v1/halls/not-a-number", name: "Bad Hall" }],
        }),
      );

    await scrapeAllHalls("auth-token");

    // No local existence check or POST should have fired.
    const postCalls = fetchSpy.mock.calls.filter(
      ([, init]) => (init as RequestInit)?.method === "POST",
    );
    // Only the login POST (fetchScraperJwt) should exist, not a hall creation POST.
    expect(postCalls.every(([url]) => typeof url === "string" && url.includes("login"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// scrapeAllHalls
// ---------------------------------------------------------------------------

describe("scrapeAllHalls", () => {
  afterEach(() => vi.restoreAllMocks());

  it("iterates all pages and imports each hall", async () => {
    vi.spyOn(global, "fetch")
      // fetchScraperJwt (login endpoint)
      .mockResolvedValueOnce(jsonResponse({ token: "jwt-token" }))
      // page 1 meta (also the first data fetch — function fetches p1 twice in the current impl)
      .mockResolvedValueOnce(
        jsonResponse({
          totalItems: 2,
          view: { last: "/api/v1/halls?page=1" },
          member: [
            { "@id": "/api/v1/halls/1", name: "Hall 1" },
            { "@id": "/api/v1/halls/2", name: "Hall 2" },
          ],
        }),
      )
      // page 1 data
      .mockResolvedValueOnce(
        jsonResponse({
          totalItems: 2,
          member: [
            { "@id": "/api/v1/halls/1", name: "Hall 1" },
            { "@id": "/api/v1/halls/2", name: "Hall 2" },
          ],
        }),
      )
      // local checks for hall 1 & 2
      .mockResolvedValueOnce(jsonResponse([]))                   // hall 1 not local
      .mockResolvedValueOnce(jsonResponse({ id: 11 }, 201))      // POST hall 1
      .mockResolvedValueOnce(jsonResponse([]))                   // hall 2 not local
      .mockResolvedValueOnce(jsonResponse({ id: 22 }, 201));     // POST hall 2

    // Should resolve without throwing.
    await expect(scrapeAllHalls("auth-token")).resolves.toBeUndefined();
  });

  it("skips halls that already exist locally during full crawl", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(jsonResponse({ token: "jwt-token" }))
      .mockResolvedValueOnce(
        jsonResponse({
          totalItems: 1,
          view: { last: "/api/v1/halls?page=1" },
          member: [{ "@id": "/api/v1/halls/1", name: "Existing Hall" }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          totalItems: 1,
          member: [{ "@id": "/api/v1/halls/1", name: "Existing Hall" }],
        }),
      )
      // Hall already exists locally.
      .mockResolvedValueOnce(jsonResponse([{ id: 99, old_id: 1, name: "Existing Hall" }]));

    await scrapeAllHalls("auth-token");

    // Only the login POST should have fired.
    const postCalls = fetchSpy.mock.calls.filter(
      ([, init]) => (init as RequestInit)?.method === "POST",
    );
    expect(postCalls).toHaveLength(1);
    expect(postCalls[0]).toContain("http://localhost:3000/api/v1/auth/login");
  });
});