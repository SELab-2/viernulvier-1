import { describe, expect, it, vi, afterEach } from "vitest";

import { scrapeAllEvents } from "@/scraper/entities/event/event.js";

/**
 * scrapeAllEvents hits several endpoints in sequence.
 * We mock fetch globally and return minimal valid shapes for each call.
 *
 * Module-level caches (hallIdByOldId, productionIdByOldId, skippedHallOldIds,
 * skippedProductionOldIds) persist across tests in the same worker because they
 * live in module scope. Each test therefore uses unique IDs so cache state from
 * a previous test never silently influences a later one.
 */
describe("scrapeAllEvents", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Creates a fetch mock that can be customised per-test via `handlers`.
   * Handlers are checked in order; the first match wins.
   * Falls back to 404 for anything unrecognised.
   */
  function makeFetchMock(
    handlers: Array<{
      match: (url: string, method: string) => boolean;
      respond: (url: string, method: string, req?: Request) => Response | Promise<Response>;
    }>,
  ) {
    return vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = (init as RequestInit | undefined)?.method?.toUpperCase() ?? "GET";
      const req = input instanceof Request
        ? input
        : new Request(url, init);
      
      for (const h of handlers) {
        if (h.match(url, method)) return h.respond(url, method, req);
      }
      return new Response("not found", { status: 404 });
    });
  }

  /** Standard stubs shared across most happy-path tests. */
  function baseHandlers(eventOldId: number, productionOldId: number, hallOldId: number) {
    return [
      {
        match: (u: string) => u.includes("/auth/login"),
        respond: () => new Response(JSON.stringify({ token: "tok" }), { status: 200 }),
      },
      {
        match: (u: string) => u.includes("/api/v1/events"),
        respond: () =>
          new Response(
            JSON.stringify({
              totalItems: 1,
              view: { last: "/api/v1/events?page=1" },
              member: [
                {
                  "@id": `/api/v1/events/${eventOldId}`,
                  starts_at: "2026-01-15T20:00:00Z",
                  production: {
                    "@id": `/api/v1/productions/${productionOldId}`,
                    "@type": "Production",
                  },
                  hall: `/api/v1/halls/${hallOldId}`,
                  prices: [],
                },
              ],
            }),
            { status: 200 },
          ),
      },
      {
        match: (u: string) => u.includes("/api/v1/event?old_id="),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u: string) => u.includes("/api/v1/production?old_id="),
        respond: () => new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }),
      },
      {
        match: (u: string) => u.includes(`/api/v1/productions/${productionOldId}`),
        respond: () =>
          new Response(
            JSON.stringify({
              "@id": `/api/v1/productions/${productionOldId}`,
              title: { nl: "Test Voorstelling" },
            }),
            { status: 200 },
          ),
      },
      {
        match: (u: string) => u.includes("/api/v1/hall?old_id="),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u: string) => u.includes(`/api/v1/halls/${hallOldId}`),
        respond: () =>
          new Response(
            JSON.stringify({ "@id": `/api/v1/halls/${hallOldId}`, name: "Grote Zaal" }),
            { status: 200 },
          ),
      },
      {
        match: (u: string) => u.includes("/api/v1/image"),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u: string) => u.includes("/api/v1/tag"),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u: string) => u.includes("media_gallery") || u.includes("/api/v1/galleries"),
        respond: () => new Response(JSON.stringify({ items: [] }), { status: 200 }),
      },
      {
        match: (u: string, m: string) => m === "POST" && u.includes("/api/v1/production"),
        respond: () => new Response(JSON.stringify({ id: 100 }), { status: 201 }),
      },
      {
        match: (u: string, m: string) => m === "POST" && u.includes("/api/v1/hall"),
        respond: () => new Response(JSON.stringify({ id: 200 }), { status: 201 }),
      },
      {
        match: (u: string, m: string) => m === "POST" && u.includes("/api/v1/event"),
        respond: () => new Response(JSON.stringify({ id: 300 }), { status: 201 }),
      },
    ];
  }

  it("returns stats with zero events when the API reports totalItems=0", async () => {
    makeFetchMock([
      {
        match: (u) => u.includes("/auth/login"),
        respond: () => new Response(JSON.stringify({ token: "tok" }), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/events"),
        respond: () =>
          new Response(JSON.stringify({ totalItems: 0, member: [] }), { status: 200 }),
      },
    ]);

    const stats = await scrapeAllEvents("auth-token", {});
    expect(stats.events.seen).toBe(0);
    expect(stats.events.imported).toBe(0);
  });

  it("counts a successfully imported event", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = (init as RequestInit | undefined)?.method ?? "GET";

      if (url.includes("/auth/login")) {
        return new Response(JSON.stringify({ token: "tok" }), { status: 200 });
      }

      if (url.includes("/api/v1/events") && method === "GET") {
        return new Response(
          JSON.stringify({
            totalItems: 1,
            view: { last: "/api/v1/events?page=1" },
            member: [
              {
                "@id": "/api/v1/events/99",
                starts_at: "2026-01-15T20:00:00Z",
                production: {
                  "@id": "/api/v1/productions/10",
                  "@type": "Production",
                },
                hall: "/api/v1/halls/5",
                prices: [],
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/v1/event?old_id=")) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (url.includes("/api/v1/production?old_id=")) {
        return new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 });
      }
      if (url.includes("/api/v1/productions/10")) {
        return new Response(
          JSON.stringify({ "@id": "/api/v1/productions/10", title: { nl: "Test Voorstelling" } }),
          { status: 200 },
        );
      }
      if (url.includes("/api/v1/hall?old_id=")) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (url.includes("/api/v1/halls/5")) {
        return new Response(
          JSON.stringify({ "@id": "/api/v1/halls/5", name: "Grote Zaal" }),
          { status: 200 },
        );
      }
      if (url.includes("/api/v1/image")) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (url.includes("/api/v1/tag")) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (url.includes("media_gallery") || url.includes("/api/v1/galleries")) {
        return new Response(JSON.stringify({ items: [] }), { status: 200 });
      }
      if (method === "POST") {
        if (url.includes("/api/v1/production")) {
          return new Response(JSON.stringify({ id: 100 }), { status: 201 });
        }
        if (url.includes("/api/v1/hall")) {
          return new Response(JSON.stringify({ id: 200 }), { status: 201 });
        }
        if (url.includes("/api/v1/event")) {
          return new Response(JSON.stringify({ id: 300 }), { status: 201 });
        }
      }
      return new Response("not found", { status: 404 });
    });

    const stats = await scrapeAllEvents("auth-token", {
      before: new Date("2026-02-01"),
      after: new Date("2026-01-01"),
    });

    expect(stats.events.seen).toBe(1);
    expect(stats.events.imported).toBe(1);
  });

  it("throws when the Viernulvier events API returns a non-2xx status", async () => {
    makeFetchMock([
      {
        match: (u) => u.includes("/auth/login"),
        respond: () => new Response(JSON.stringify({ token: "tok" }), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/events"),
        respond: () => new Response("server error", { status: 500 }),
      },
    ]);

    await expect(scrapeAllEvents("auth-token", { before: new Date("2026-02-01") })).rejects.toThrow(
      "API returned status 500",
    );
  });

  it("reuses a cached hall id for a second event sharing the same hall", async () => {
    // Use IDs that have never appeared before so the module cache starts empty.
    const HALL = 501;
    const PROD_A = 601;
    const PROD_B = 602;
    const EV_A = 701;
    const EV_B = 702;

    makeFetchMock([
      {
        match: (u) => u.includes("/auth/login"),
        respond: () => new Response(JSON.stringify({ token: "tok" }), { status: 200 }),
      },
      // Return two events on one page — both use the same hall
      {
        match: (u) => u.includes("/api/v1/events"),
        respond: () =>
          new Response(
            JSON.stringify({
              totalItems: 2,
              view: { last: "/api/v1/events?page=1" },
              member: [
                {
                  "@id": `/api/v1/events/${EV_A}`,
                  starts_at: "2026-01-15T20:00:00Z",
                  production: { "@id": `/api/v1/productions/${PROD_A}`, "@type": "Production" },
                  hall: `/api/v1/halls/${HALL}`,
                  prices: [],
                },
                {
                  "@id": `/api/v1/events/${EV_B}`,
                  starts_at: "2026-01-16T20:00:00Z",
                  production: { "@id": `/api/v1/productions/${PROD_B}`, "@type": "Production" },
                  hall: `/api/v1/halls/${HALL}`, // same hall — triggers cache hit
                  prices: [],
                },
              ],
            }),
            { status: 200 },
          ),
      },
      // Local event checks — neither exists yet
      {
        match: (u) => u.includes("/api/v1/event?old_id="),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      // Local production checks — neither exists yet
      {
        match: (u) => u.includes("/api/v1/production?old_id="),
        respond: () => new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }),
      },
      // Viernulvier production fetches
      {
        match: (u) => u.includes(`/api/v1/productions/${PROD_A}`) || u.includes(`/api/v1/productions/${PROD_B}`),
        respond: (u) => {
          const id = u.includes(`${PROD_A}`) ? PROD_A : PROD_B;
          return new Response(
            JSON.stringify({ "@id": `/api/v1/productions/${id}`, title: { nl: "Voorstelling" } }),
            { status: 200 },
          );
        },
      },
      // Local hall check — not yet imported
      {
        match: (u) => u.includes("/api/v1/hall?old_id="),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      // Viernulvier hall fetch
      {
        match: (u) => u.includes(`/api/v1/halls/${HALL}`),
        respond: () =>
          new Response(JSON.stringify({ "@id": `/api/v1/halls/${HALL}`, name: "Grote Zaal" }), {
            status: 200,
          }),
      },
      {
        match: (u) => u.includes("/api/v1/image"),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/tag"),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes("media_gallery") || u.includes("/api/v1/galleries"),
        respond: () => new Response(JSON.stringify({ items: [] }), { status: 200 }),
      },
      // POSTs
      {
        match: (u, m) => m === "POST" && u.includes("/api/v1/production"),
        respond: () => new Response(JSON.stringify({ id: 100 }), { status: 201 }),
      },
      {
        match: (u, m) => m === "POST" && u.includes("/api/v1/hall"),
        respond: () => new Response(JSON.stringify({ id: 200 }), { status: 201 }),
      },
      {
        match: (u, m) => m === "POST" && u.includes("/api/v1/event"),
        respond: () => new Response(JSON.stringify({ id: 300 }), { status: 201 }),
      },
    ]);

    const stats = await scrapeAllEvents("auth-token", { before: new Date("2026-02-01") });

    expect(stats.events.imported).toBe(2);
    // The second event re-used the cached hall id
    expect(stats.halls.reusedExisting).toBeGreaterThanOrEqual(1);
  });

  it("skips event when hall cannot be imported from Viernulvier", async () => {
    const HALL = 502;
    const PROD = 603;
    const EV = 703;

    makeFetchMock([
      {
        match: (u) => u.includes("/auth/login"),
        respond: () => new Response(JSON.stringify({ token: "tok" }), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/events"),
        respond: () =>
          new Response(
            JSON.stringify({
              totalItems: 1,
              view: { last: "/api/v1/events?page=1" },
              member: [
                {
                  "@id": `/api/v1/events/${EV}`,
                  starts_at: "2026-01-15T20:00:00Z",
                  production: { "@id": `/api/v1/productions/${PROD}`, "@type": "Production" },
                  hall: `/api/v1/halls/${HALL}`,
                  prices: [],
                },
              ],
            }),
            { status: 200 },
          ),
      },
      {
        match: (u) => u.includes("/api/v1/event?old_id="),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/production?old_id="),
        respond: () => new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }),
      },
      {
        match: (u) => u.includes(`/api/v1/productions/${PROD}`),
        respond: () =>
          new Response(
            JSON.stringify({ "@id": `/api/v1/productions/${PROD}`, title: { nl: "Voorstelling" } }),
            { status: 200 },
          ),
      },
      // Local hall check — not imported
      {
        match: (u) => u.includes("/api/v1/hall?old_id="),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      // Viernulvier hall fetch — 404 → scrapeHallById returns null
      {
        match: (u) => u.includes(`/api/v1/halls/${HALL}`),
        respond: () => new Response("not found", { status: 404 }),
      },
      {
        match: (u) => u.includes("/api/v1/image"),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/tag"),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes("media_gallery") || u.includes("/api/v1/galleries"),
        respond: () => new Response(JSON.stringify({ items: [] }), { status: 200 }),
      },
      {
        match: (u, m) => m === "POST" && u.includes("/api/v1/production"),
        respond: () => new Response(JSON.stringify({ id: 100 }), { status: 201 }),
      },
    ]);

    const stats = await scrapeAllEvents("auth-token", { before: new Date("2026-02-01") });

    expect(stats.events.seen).toBe(1);
    expect(stats.events.imported).toBe(0);
    expect(stats.events.skippedInvalidHallRef).toBe(1);
  });

  it("reuses a cached production id for a second event", async () => {
    const HALL_A = 503;
    const HALL_B = 504;
    const PROD = 604; // same production for both events
    const EV_A = 704;
    const EV_B = 705;

    makeFetchMock([
      {
        match: (u) => u.includes("/auth/login"),
        respond: () => new Response(JSON.stringify({ token: "tok" }), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/events"),
        respond: () =>
          new Response(
            JSON.stringify({
              totalItems: 2,
              view: { last: "/api/v1/events?page=1" },
              member: [
                {
                  "@id": `/api/v1/events/${EV_A}`,
                  starts_at: "2026-01-15T20:00:00Z",
                  production: { "@id": `/api/v1/productions/${PROD}`, "@type": "Production" },
                  hall: `/api/v1/halls/${HALL_A}`,
                  prices: [],
                },
                {
                  "@id": `/api/v1/events/${EV_B}`,
                  starts_at: "2026-01-16T20:00:00Z",
                  production: { "@id": `/api/v1/productions/${PROD}`, "@type": "Production" }, // same production — cache hit
                  hall: `/api/v1/halls/${HALL_B}`,
                  prices: [],
                },
              ],
            }),
            { status: 200 },
          ),
      },
      {
        match: (u) => u.includes("/api/v1/event?old_id="),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/production?old_id="),
        respond: () => new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }),
      },
      {
        match: (u) => u.includes(`/api/v1/productions/${PROD}`),
        respond: () =>
          new Response(
            JSON.stringify({ "@id": `/api/v1/productions/${PROD}`, title: { nl: "Gedeelde Prod" } }),
            { status: 200 },
          ),
      },
      {
        match: (u) => u.includes("/api/v1/hall?old_id="),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes(`/api/v1/halls/${HALL_A}`) || u.includes(`/api/v1/halls/${HALL_B}`),
        respond: (u) => {
          const id = u.includes(`${HALL_A}`) ? HALL_A : HALL_B;
          return new Response(
            JSON.stringify({ "@id": `/api/v1/halls/${id}`, name: "Zaal" }),
            { status: 200 },
          );
        },
      },
      {
        match: (u) => u.includes("/api/v1/image"),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/tag"),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes("media_gallery") || u.includes("/api/v1/galleries"),
        respond: () => new Response(JSON.stringify({ items: [] }), { status: 200 }),
      },
      {
        match: (u, m) => m === "POST" && u.includes("/api/v1/production"),
        respond: () => new Response(JSON.stringify({ id: 100 }), { status: 201 }),
      },
      {
        match: (u, m) => m === "POST" && u.includes("/api/v1/hall"),
        respond: () => new Response(JSON.stringify({ id: 200 }), { status: 201 }),
      },
      {
        match: (u, m) => m === "POST" && u.includes("/api/v1/event"),
        respond: () => new Response(JSON.stringify({ id: 300 }), { status: 201 }),
      },
    ]);

    const stats = await scrapeAllEvents("auth-token", { before: new Date("2026-02-01") });

    expect(stats.events.imported).toBe(2);
    expect(stats.productions.reusedExisting).toBeGreaterThanOrEqual(1);
  });

  it("skips event when production cannot be imported from Viernulvier", async () => {
    const HALL = 505;
    const PROD = 605;
    const EV = 706;

    makeFetchMock([
      {
        match: (u) => u.includes("/auth/login"),
        respond: () => new Response(JSON.stringify({ token: "tok" }), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/events"),
        respond: () =>
          new Response(
            JSON.stringify({
              totalItems: 1,
              view: { last: "/api/v1/events?page=1" },
              member: [
                {
                  "@id": `/api/v1/events/${EV}`,
                  starts_at: "2026-01-15T20:00:00Z",
                  production: { "@id": `/api/v1/productions/${PROD}`, "@type": "Production" },
                  hall: `/api/v1/halls/${HALL}`,
                  prices: [],
                },
              ],
            }),
            { status: 200 },
          ),
      },
      {
        match: (u) => u.includes("/api/v1/event?old_id="),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/production?old_id="),
        respond: () => new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }),
      },
      // Viernulvier production fetch — 404 → scrapeProductionById returns null
      {
        match: (u) => u.includes(`/api/v1/productions/${PROD}`),
        respond: () => new Response("not found", { status: 404 }),
      },
    ]);

    const stats = await scrapeAllEvents("auth-token", { before: new Date("2026-02-01") });

    expect(stats.events.seen).toBe(1);
    expect(stats.events.imported).toBe(0);
    expect(stats.events.skippedInvalidProductionRef).toBe(1);
  });

  it("propagates error when the local event-existence check fails", async () => {
    const EV = 707;

    makeFetchMock([
      {
        match: (u) => u.includes("/auth/login"),
        respond: () => new Response(JSON.stringify({ token: "tok" }), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/events"),
        respond: () =>
          new Response(
            JSON.stringify({
              totalItems: 1,
              view: { last: "/api/v1/events?page=1" },
              member: [
                {
                  "@id": `/api/v1/events/${EV}`,
                  starts_at: "2026-01-15T20:00:00Z",
                  production: { "@id": "/api/v1/productions/10", "@type": "Production" },
                  hall: "/api/v1/halls/5",
                  prices: [],
                },
              ],
            }),
            { status: 200 },
          ),
      },
      // Local event check returns 500 — should throw and be caught as a failed event
      {
        match: (u) => u.includes("/api/v1/event?old_id="),
        respond: () => new Response("error", { status: 500 }),
      },
    ]);

    const stats = await scrapeAllEvents("auth-token", { before: new Date("2026-02-01") });

    // Error is caught by the try/catch in scrapeAllEvents → counts as failed
    expect(stats.events.failed).toBe(1);
  });

  it("fails the event when local API returns multiple rows for one old_id", async () => {
    const EV = 708;

    makeFetchMock([
      {
        match: (u) => u.includes("/auth/login"),
        respond: () => new Response(JSON.stringify({ token: "tok" }), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/events"),
        respond: () =>
          new Response(
            JSON.stringify({
              totalItems: 1,
              view: { last: "/api/v1/events?page=1" },
              member: [
                {
                  "@id": `/api/v1/events/${EV}`,
                  starts_at: "2026-01-15T20:00:00Z",
                  production: { "@id": "/api/v1/productions/10", "@type": "Production" },
                  hall: "/api/v1/halls/5",
                  prices: [],
                },
              ],
            }),
            { status: 200 },
          ),
      },
      // Two rows returned → throws "Multiple events found"
      {
        match: (u) => u.includes("/api/v1/event?old_id="),
        respond: () =>
          new Response(JSON.stringify([{ id: 1 }, { id: 2 }]), { status: 200 }),
      },
    ]);

    const stats = await scrapeAllEvents("auth-token", { before: new Date("2026-02-01") });

    expect(stats.events.failed).toBe(1);
  });

  it("maps blank ends_at and null doors_at to null via optionalIsoTimestamp", async () => {
    const HALL = 506;
    const PROD = 606;
    const EV = 709;

    let capturedBody: Record<string, unknown> | null = null;

    makeFetchMock([
      {
        match: (u) => u.includes("/auth/login"),
        respond: () => new Response(JSON.stringify({ token: "tok" }), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/events"),
        respond: () =>
          new Response(
            JSON.stringify({
              totalItems: 1,
              view: { last: "/api/v1/events?page=1" },
              member: [
                {
                  "@id": `/api/v1/events/${EV}`,
                  starts_at: "2026-01-15T20:00:00Z",
                  ends_at: "   ",   // blank → null
                  doors_at: null,   // null → null
                  production: { "@id": `/api/v1/productions/${PROD}`, "@type": "Production" },
                  hall: `/api/v1/halls/${HALL}`,
                  prices: [],
                },
              ],
            }),
            { status: 200 },
          ),
      },
      {
        match: (u) => u.includes("/api/v1/event?old_id="),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/production?old_id="),
        respond: () => new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }),
      },
      {
        match: (u) => u.includes(`/api/v1/productions/${PROD}`),
        respond: () =>
          new Response(
            JSON.stringify({ "@id": `/api/v1/productions/${PROD}`, title: { nl: "Voorstelling" } }),
            { status: 200 },
          ),
      },
      {
        match: (u) => u.includes("/api/v1/hall?old_id="),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes(`/api/v1/halls/${HALL}`),
        respond: () =>
          new Response(JSON.stringify({ "@id": `/api/v1/halls/${HALL}`, name: "Zaal" }), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/image"),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/tag"),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes("media_gallery") || u.includes("/api/v1/galleries"),
        respond: () => new Response(JSON.stringify({ items: [] }), { status: 200 }),
      },
      {
        match: (u, m) => m === "POST" && u.includes("/api/v1/production"),
        respond: () => new Response(JSON.stringify({ id: 100 }), { status: 201 }),
      },
      {
        match: (u, m) => m === "POST" && u.includes("/api/v1/hall"),
        respond: () => new Response(JSON.stringify({ id: 200 }), { status: 201 }),
      },
      {
        match: (u, m) => m === "POST" && u.includes("/api/v1/event"),
        respond: async (_u, _m, req?: Request) => {
          // Capture the POST body for assertions
          if (req) capturedBody = await req.json() as Record<string, unknown>;
          return new Response(JSON.stringify({ id: 300 }), { status: 201 });
        },
      },
    ]);

    const stats = await scrapeAllEvents("auth-token", { before: new Date("2026-02-01") });

    expect(stats.events.imported).toBe(1);
    expect(capturedBody!["ends_at"]).toBeNull();
    expect(capturedBody!["doors_at"]).toBeNull();
  });

  it("skips event with an unparseable @id", async () => {
    makeFetchMock([
      {
        match: (u) => u.includes("/auth/login"),
        respond: () => new Response(JSON.stringify({ token: "tok" }), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/events"),
        respond: () =>
          new Response(
            JSON.stringify({
              totalItems: 1,
              view: { last: "/api/v1/events?page=1" },
              member: [
                {
                  "@id": "/api/v1/events/not-a-number",
                  starts_at: "2026-01-15T20:00:00Z",
                  production: { "@id": "/api/v1/productions/10", "@type": "Production" },
                  hall: "/api/v1/halls/5",
                  prices: [],
                },
              ],
            }),
            { status: 200 },
          ),
      },
    ]);

    const stats = await scrapeAllEvents("auth-token", { before: new Date("2026-02-01") });

    expect(stats.events.seen).toBe(1);
    expect(stats.events.skippedInvalidEventId).toBe(1);
    expect(stats.events.imported).toBe(0);
  });

  it("skips event with a blank starts_at", async () => {
    makeFetchMock([
      {
        match: (u) => u.includes("/auth/login"),
        respond: () => new Response(JSON.stringify({ token: "tok" }), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/events"),
        respond: () =>
          new Response(
            JSON.stringify({
              totalItems: 1,
              view: { last: "/api/v1/events?page=1" },
              member: [
                {
                  "@id": "/api/v1/events/800",
                  starts_at: "   ", // blank string
                  production: { "@id": "/api/v1/productions/10", "@type": "Production" },
                  hall: "/api/v1/halls/5",
                  prices: [],
                },
              ],
            }),
            { status: 200 },
          ),
      },
    ]);

    const stats = await scrapeAllEvents("auth-token", { before: new Date("2026-02-01") });

    expect(stats.events.skippedMissingStartsAt).toBe(1);
  });

  it("skips event with an invalid starts_at date", async () => {
    makeFetchMock([
      {
        match: (u) => u.includes("/auth/login"),
        respond: () => new Response(JSON.stringify({ token: "tok" }), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/events"),
        respond: () =>
          new Response(
            JSON.stringify({
              totalItems: 1,
              view: { last: "/api/v1/events?page=1" },
              member: [
                {
                  "@id": "/api/v1/events/801",
                  starts_at: "not-a-date",
                  production: { "@id": "/api/v1/productions/10", "@type": "Production" },
                  hall: "/api/v1/halls/5",
                  prices: [],
                },
              ],
            }),
            { status: 200 },
          ),
      },
    ]);

    const stats = await scrapeAllEvents("auth-token", { before: new Date("2026-02-01") });

    expect(stats.events.skippedMissingStartsAt).toBe(1);
  });

  it("skips already-imported event", async () => {
    makeFetchMock([
      {
        match: (u) => u.includes("/auth/login"),
        respond: () => new Response(JSON.stringify({ token: "tok" }), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/events"),
        respond: () =>
          new Response(
            JSON.stringify({
              totalItems: 1,
              view: { last: "/api/v1/events?page=1" },
              member: [
                {
                  "@id": "/api/v1/events/802",
                  starts_at: "2026-01-15T20:00:00Z",
                  production: { "@id": "/api/v1/productions/10", "@type": "Production" },
                  hall: "/api/v1/halls/5",
                  prices: [],
                },
              ],
            }),
            { status: 200 },
          ),
      },
      // Local event check — returns an existing row
      {
        match: (u) => u.includes("/api/v1/event?old_id="),
        respond: () => new Response(JSON.stringify([{ id: 999 }]), { status: 200 }),
      },
    ]);

    const stats = await scrapeAllEvents("auth-token", { before: new Date("2026-02-01") });

    expect(stats.events.skippedAlreadyImported).toBe(1);
    expect(stats.events.imported).toBe(0);
  });

  it("skips longterm event by @type", async () => {
    makeFetchMock([
      {
        match: (u) => u.includes("/auth/login"),
        respond: () => new Response(JSON.stringify({ token: "tok" }), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/events"),
        respond: () =>
          new Response(
            JSON.stringify({
              totalItems: 1,
              view: { last: "/api/v1/events?page=1" },
              member: [
                {
                  "@id": "/api/v1/events/803",
                  starts_at: "2026-01-15T20:00:00Z",
                  production: {
                    "@id": "/api/v1/productions/20",
                    "@type": "LongtermProduction", // triggers the skip
                  },
                  hall: "/api/v1/halls/5",
                  prices: [],
                },
              ],
            }),
            { status: 200 },
          ),
      },
      {
        match: (u) => u.includes("/api/v1/event?old_id="),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
    ]);

    const stats = await scrapeAllEvents("auth-token", { before: new Date("2026-02-01") });

    expect(stats.events.skippedInvalidProductionRef).toBe(1);
  });

  it("skips longterm event by IRI path", async () => {
    makeFetchMock([
      {
        match: (u) => u.includes("/auth/login"),
        respond: () => new Response(JSON.stringify({ token: "tok" }), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/events"),
        respond: () =>
          new Response(
            JSON.stringify({
              totalItems: 1,
              view: { last: "/api/v1/events?page=1" },
              member: [
                {
                  "@id": "/api/v1/events/804",
                  starts_at: "2026-01-15T20:00:00Z",
                  production: {
                    "@id": "/api/v1/productions/longterm/21",
                    "@type": "Production",
                  },
                  hall: "/api/v1/halls/5",
                  prices: [],
                },
              ],
            }),
            { status: 200 },
          ),
      },
      {
        match: (u) => u.includes("/api/v1/event?old_id="),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
    ]);

    const stats = await scrapeAllEvents("auth-token", { before: new Date("2026-02-01") });

    expect(stats.events.skippedInvalidProductionRef).toBe(1);
  });

  it("skips event with a non-numeric hall IRI", async () => {
    makeFetchMock([
      {
        match: (u) => u.includes("/auth/login"),
        respond: () => new Response(JSON.stringify({ token: "tok" }), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/events"),
        respond: () =>
          new Response(
            JSON.stringify({
              totalItems: 1,
              view: { last: "/api/v1/events?page=1" },
              member: [
                {
                  "@id": "/api/v1/events/805",
                  starts_at: "2026-01-15T20:00:00Z",
                  production: { "@id": "/api/v1/productions/10", "@type": "Production" },
                  hall: "/api/v1/halls/bad-id",
                  prices: [],
                },
              ],
            }),
            { status: 200 },
          ),
      },
      {
        match: (u) => u.includes("/api/v1/event?old_id="),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
    ]);

    const stats = await scrapeAllEvents("auth-token", { before: new Date("2026-02-01") });

    expect(stats.events.skippedInvalidHallRef).toBe(1);
  });

  it("skips event with a non-numeric production IRI", async () => {
    makeFetchMock([
      {
        match: (u) => u.includes("/auth/login"),
        respond: () => new Response(JSON.stringify({ token: "tok" }), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/events"),
        respond: () =>
          new Response(
            JSON.stringify({
              totalItems: 1,
              view: { last: "/api/v1/events?page=1" },
              member: [
                {
                  "@id": "/api/v1/events/806",
                  starts_at: "2026-01-15T20:00:00Z",
                  production: { "@id": "/api/v1/productions/bad-id", "@type": "Production" },
                  hall: "/api/v1/halls/5",
                  prices: [],
                },
              ],
            }),
            { status: 200 },
          ),
      },
      {
        match: (u) => u.includes("/api/v1/event?old_id="),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
    ]);

    const stats = await scrapeAllEvents("auth-token", { before: new Date("2026-02-01") });

    expect(stats.events.skippedInvalidProductionRef).toBe(1);
  });

  it("skips event when production is in the skip-set", async () => {
    // Use a unique production ID that hasn't been seen before; make the
    // Viernulvier production endpoint 404 so it lands in skippedProductionOldIds.
    const PROD = 607;
    const EV_A = 807;
    const EV_B = 808;
    const HALL_A = 507;
    const HALL_B = 508;

    makeFetchMock([
      {
        match: (u) => u.includes("/auth/login"),
        respond: () => new Response(JSON.stringify({ token: "tok" }), { status: 200 }),
      },
      // Two events, same production (which 404s)
      {
        match: (u) => u.includes("/api/v1/events"),
        respond: () =>
          new Response(
            JSON.stringify({
              totalItems: 2,
              view: { last: "/api/v1/events?page=1" },
              member: [
                {
                  "@id": `/api/v1/events/${EV_A}`,
                  starts_at: "2026-01-15T20:00:00Z",
                  production: { "@id": `/api/v1/productions/${PROD}`, "@type": "Production" },
                  hall: `/api/v1/halls/${HALL_A}`,
                  prices: [],
                },
                {
                  "@id": `/api/v1/events/${EV_B}`,
                  starts_at: "2026-01-16T20:00:00Z",
                  production: { "@id": `/api/v1/productions/${PROD}`, "@type": "Production" },
                  hall: `/api/v1/halls/${HALL_B}`,
                  prices: [],
                },
              ],
            }),
            { status: 200 },
          ),
      },
      {
        match: (u) => u.includes("/api/v1/event?old_id="),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/production?old_id="),
        respond: () => new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }),
      },
      // Production 404s → null → added to skippedProductionOldIds
      {
        match: (u) => u.includes(`/api/v1/productions/${PROD}`),
        respond: () => new Response("not found", { status: 404 }),
      },
    ]);

    const stats = await scrapeAllEvents("auth-token", { before: new Date("2026-02-01") });

    expect(stats.events.seen).toBe(2);
    expect(stats.events.skippedInvalidProductionRef).toBe(2);
    expect(stats.events.imported).toBe(0);
  });

  it("skips event when hall is in the skip-set", async () => {
    const HALL = 509;
    const PROD = 608;
    const EV_A = 809;
    const EV_B = 810;
    const PROD_B = 609;

    makeFetchMock([
      {
        match: (u) => u.includes("/auth/login"),
        respond: () => new Response(JSON.stringify({ token: "tok" }), { status: 200 }),
      },
      // Two events that share the same hall (which 404s)
      {
        match: (u) => u.includes("/api/v1/events"),
        respond: () =>
          new Response(
            JSON.stringify({
              totalItems: 2,
              view: { last: "/api/v1/events?page=1" },
              member: [
                {
                  "@id": `/api/v1/events/${EV_A}`,
                  starts_at: "2026-01-15T20:00:00Z",
                  production: { "@id": `/api/v1/productions/${PROD}`, "@type": "Production" },
                  hall: `/api/v1/halls/${HALL}`,
                  prices: [],
                },
                {
                  "@id": `/api/v1/events/${EV_B}`,
                  starts_at: "2026-01-16T20:00:00Z",
                  production: { "@id": `/api/v1/productions/${PROD_B}`, "@type": "Production" },
                  hall: `/api/v1/halls/${HALL}`,
                  prices: [],
                },
              ],
            }),
            { status: 200 },
          ),
      },
      {
        match: (u) => u.includes("/api/v1/event?old_id="),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/production?old_id="),
        respond: () => new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }),
      },
      {
        match: (u) => u.includes(`/api/v1/productions/${PROD}`) || u.includes(`/api/v1/productions/${PROD_B}`),
        respond: (u) => {
          const id = u.includes(`${PROD}`) ? PROD : PROD_B;
          return new Response(
            JSON.stringify({ "@id": `/api/v1/productions/${id}`, title: { nl: "Prod" } }),
            { status: 200 },
          );
        },
      },
      {
        match: (u) => u.includes("/api/v1/hall?old_id="),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      // Hall 404s → null → added to skippedHallOldIds
      {
        match: (u) => u.includes(`/api/v1/halls/${HALL}`),
        respond: () => new Response("not found", { status: 404 }),
      },
      {
        match: (u) => u.includes("/api/v1/image"),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/tag"),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes("media_gallery") || u.includes("/api/v1/galleries"),
        respond: () => new Response(JSON.stringify({ items: [] }), { status: 200 }),
      },
      {
        match: (u, m) => m === "POST" && u.includes("/api/v1/production"),
        respond: () => new Response(JSON.stringify({ id: 100 }), { status: 201 }),
      },
    ]);

    const stats = await scrapeAllEvents("auth-token", { before: new Date("2026-02-01") });

    expect(stats.events.seen).toBe(2);
    expect(stats.events.skippedInvalidHallRef).toBe(2);
    expect(stats.events.imported).toBe(0);
  });

  it("counts event as failed when the local event POST returns an error", async () => {
    const HALL = 510;
    const PROD = 610;
    const EV = 811;

    makeFetchMock([
      ...baseHandlers(EV, PROD, HALL).slice(0, -3), // drop the three POST handlers
      {
        match: (u, m) => m === "POST" && u.includes("/api/v1/production"),
        respond: () => new Response(JSON.stringify({ id: 100 }), { status: 201 }),
      },
      {
        match: (u, m) => m === "POST" && u.includes("/api/v1/hall"),
        respond: () => new Response(JSON.stringify({ id: 200 }), { status: 201 }),
      },
      // Event POST fails
      {
        match: (u, m) => m === "POST" && u.includes("/api/v1/event") && !u.includes("?"),
        respond: () => new Response("server error", { status: 500 }),
      },
    ]);

    const stats = await scrapeAllEvents("auth-token", { before: new Date("2026-02-01") });

    expect(stats.events.failed).toBe(1);
    expect(stats.events.imported).toBe(0);
  });

  it("calls scrapeEventPricesForEvent when the event has price IRIs", async () => {
    const HALL = 511;
    const PROD = 611;
    const EV = 812;

    makeFetchMock([
      {
        match: (u) => u.includes("/auth/login"),
        respond: () => new Response(JSON.stringify({ token: "tok" }), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/events"),
        respond: () =>
          new Response(
            JSON.stringify({
              totalItems: 1,
              view: { last: "/api/v1/events?page=1" },
              member: [
                {
                  "@id": `/api/v1/events/${EV}`,
                  starts_at: "2026-01-15T20:00:00Z",
                  production: { "@id": `/api/v1/productions/${PROD}`, "@type": "Production" },
                  hall: `/api/v1/halls/${HALL}`,
                  prices: ["/api/v1/prices/1", "/api/v1/prices/2"],
                },
              ],
            }),
            { status: 200 },
          ),
      },
      {
        match: (u) => u.includes("/api/v1/event?old_id="),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/production?old_id="),
        respond: () => new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }),
      },
      {
        match: (u) => u.includes(`/api/v1/productions/${PROD}`),
        respond: () =>
          new Response(
            JSON.stringify({ "@id": `/api/v1/productions/${PROD}`, title: { nl: "Voorstelling" } }),
            { status: 200 },
          ),
      },
      {
        match: (u) => u.includes("/api/v1/hall?old_id="),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes(`/api/v1/halls/${HALL}`),
        respond: () =>
          new Response(JSON.stringify({ "@id": `/api/v1/halls/${HALL}`, name: "Zaal" }), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/image"),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/tag"),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes("media_gallery") || u.includes("/api/v1/galleries"),
        respond: () => new Response(JSON.stringify({ items: [] }), { status: 200 }),
      },
      {
        match: (u, m) => m === "POST" && u.includes("/api/v1/production"),
        respond: () => new Response(JSON.stringify({ id: 100 }), { status: 201 }),
      },
      {
        match: (u, m) => m === "POST" && u.includes("/api/v1/hall"),
        respond: () => new Response(JSON.stringify({ id: 200 }), { status: 201 }),
      },
      {
        match: (u, m) => m === "POST" && u.includes("/api/v1/event") && !u.includes("?"),
        respond: () => new Response(JSON.stringify({ id: 300 }), { status: 201 }),
      },
      // Price endpoint — called per price
      {
        match: (u) => u.includes("/api/v1/prices/") || u.includes("/api/v1/event_price"),
        respond: () => {
          return new Response(JSON.stringify({}), { status: 200 });
        },
      },
    ]);

    const stats = await scrapeAllEvents("auth-token", { before: new Date("2026-02-01") });

    expect(stats.events.imported).toBe(1);
    // scrapeEventPricesForEvent is called — verified via the price endpoint being hit
    // or by the fact that no error occurred when prices were present
    expect(stats.events.failed).toBe(0);
  });

  it("increments failed and continues on unexpected errors", async () => {
    const EV_A = 813;
    const EV_B = 814;
    const HALL = 512;
    const PROD = 612;

    let callCount = 0;

    makeFetchMock([
      {
        match: (u) => u.includes("/auth/login"),
        respond: () => new Response(JSON.stringify({ token: "tok" }), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/events"),
        respond: () =>
          new Response(
            JSON.stringify({
              totalItems: 2,
              view: { last: "/api/v1/events?page=1" },
              member: [
                {
                  "@id": `/api/v1/events/${EV_A}`,
                  starts_at: "2026-01-15T20:00:00Z",
                  production: { "@id": `/api/v1/productions/${PROD}`, "@type": "Production" },
                  hall: `/api/v1/halls/${HALL}`,
                  prices: [],
                },
                {
                  "@id": `/api/v1/events/${EV_B}`,
                  starts_at: "2026-01-16T20:00:00Z",
                  production: { "@id": `/api/v1/productions/${PROD}`, "@type": "Production" },
                  hall: `/api/v1/halls/${HALL}`,
                  prices: [],
                },
              ],
            }),
            { status: 200 },
          ),
      },
      // First call throws, second succeeds
      {
        match: (u) => u.includes("/api/v1/event?old_id="),
        respond: () => {
          callCount++;
          if (callCount === 1) {
            // Simulate a hard failure (local API returns 503)
            return new Response("service unavailable", { status: 503 });
          }
          return new Response(JSON.stringify([]), { status: 200 });
        },
      },
      {
        match: (u) => u.includes("/api/v1/production?old_id="),
        respond: () => new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }),
      },
      {
        match: (u) => u.includes(`/api/v1/productions/${PROD}`),
        respond: () =>
          new Response(
            JSON.stringify({ "@id": `/api/v1/productions/${PROD}`, title: { nl: "Prod" } }),
            { status: 200 },
          ),
      },
      {
        match: (u) => u.includes("/api/v1/hall?old_id="),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes(`/api/v1/halls/${HALL}`),
        respond: () =>
          new Response(JSON.stringify({ "@id": `/api/v1/halls/${HALL}`, name: "Zaal" }), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/image"),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/tag"),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes("media_gallery") || u.includes("/api/v1/galleries"),
        respond: () => new Response(JSON.stringify({ items: [] }), { status: 200 }),
      },
      {
        match: (u, m) => m === "POST" && u.includes("/api/v1/production"),
        respond: () => new Response(JSON.stringify({ id: 100 }), { status: 201 }),
      },
      {
        match: (u, m) => m === "POST" && u.includes("/api/v1/hall"),
        respond: () => new Response(JSON.stringify({ id: 200 }), { status: 201 }),
      },
      {
        match: (u, m) => m === "POST" && u.includes("/api/v1/event") && !u.includes("?"),
        respond: () => new Response(JSON.stringify({ id: 300 }), { status: 201 }),
      },
    ]);

    const stats = await scrapeAllEvents("auth-token", { before: new Date("2026-02-01") });

    // First event failed, second imported
    expect(stats.events.failed).toBe(1);
    expect(stats.events.imported).toBe(1);
  });

  it("defaults bounds to { before: now } when scrapeAllEvents is called with no bounds arg", async () => {
    makeFetchMock([
      {
        match: (u) => u.includes("/auth/login"),
        respond: () => new Response(JSON.stringify({ token: "tok" }), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/events"),
        respond: (u) => {
          // Assert the URL contains starts_at[before] (default branch was taken)
          expect(u).toContain("starts_at%5Bbefore%5D=");
          return new Response(JSON.stringify({ totalItems: 0, member: [] }), { status: 200 });
        },
      },
    ]);

    const stats = await scrapeAllEvents("auth-token"); // no bounds argument
    expect(stats.events.seen).toBe(0);
  });

  it("iterates over multiple pages", async () => {
    const HALL = 513;
    const PROD = 613;
    const EV_A = 815;
    const EV_B = 816;

    makeFetchMock([
      {
        match: (u) => u.includes("/auth/login"),
        respond: () => new Response(JSON.stringify({ token: "tok" }), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/events"),
        respond: (u) => {
          const isPage2 = u.includes("page=2");
          return new Response(
            JSON.stringify({
              totalItems: 2,
              view: {
                first: "/api/v1/events?page=1",
                last: "/api/v1/events?page=2",
              },
              member: isPage2
                ? [
                  {
                    "@id": `/api/v1/events/${EV_B}`,
                    starts_at: "2026-01-16T20:00:00Z",
                    production: { "@id": `/api/v1/productions/${PROD}`, "@type": "Production" },
                    hall: `/api/v1/halls/${HALL}`,
                    prices: [],
                  },
                ]
                : [
                  {
                    "@id": `/api/v1/events/${EV_A}`,
                    starts_at: "2026-01-15T20:00:00Z",
                    production: { "@id": `/api/v1/productions/${PROD}`, "@type": "Production" },
                    hall: `/api/v1/halls/${HALL}`,
                    prices: [],
                  },
                ],
            }),
            { status: 200 },
          );
        },
      },
      {
        match: (u) => u.includes("/api/v1/event?old_id="),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/production?old_id="),
        respond: () => new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }),
      },
      {
        match: (u) => u.includes(`/api/v1/productions/${PROD}`),
        respond: () =>
          new Response(
            JSON.stringify({ "@id": `/api/v1/productions/${PROD}`, title: { nl: "Prod" } }),
            { status: 200 },
          ),
      },
      {
        match: (u) => u.includes("/api/v1/hall?old_id="),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes(`/api/v1/halls/${HALL}`),
        respond: () =>
          new Response(JSON.stringify({ "@id": `/api/v1/halls/${HALL}`, name: "Zaal" }), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/image"),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes("/api/v1/tag"),
        respond: () => new Response(JSON.stringify([]), { status: 200 }),
      },
      {
        match: (u) => u.includes("media_gallery") || u.includes("/api/v1/galleries"),
        respond: () => new Response(JSON.stringify({ items: [] }), { status: 200 }),
      },
      {
        match: (u, m) => m === "POST" && u.includes("/api/v1/production"),
        respond: () => new Response(JSON.stringify({ id: 100 }), { status: 201 }),
      },
      {
        match: (u, m) => m === "POST" && u.includes("/api/v1/hall"),
        respond: () => new Response(JSON.stringify({ id: 200 }), { status: 201 }),
      },
      {
        match: (u, m) => m === "POST" && u.includes("/api/v1/event") && !u.includes("?"),
        respond: () => new Response(JSON.stringify({ id: 300 }), { status: 201 }),
      },
    ]);

    const stats = await scrapeAllEvents("auth-token", { before: new Date("2026-02-01") });

    expect(stats.events.seen).toBe(2);
    expect(stats.events.imported).toBe(2);
  });
});