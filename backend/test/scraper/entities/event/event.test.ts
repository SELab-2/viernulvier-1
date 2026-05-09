import { describe, expect, it, vi, afterEach } from "vitest";

import { scrapeAllEvents } from "@/scraper/entities/event/event.js";

/**
 * scrapeAllEvents hits several endpoints in sequence.
 * We mock fetch globally and return minimal valid shapes for each call.
 */
describe("scrapeAllEvents", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns stats with zero events when the API reports totalItems=0", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();

      // Scraper JWT login
      if (url.includes("/auth/login")) {
        return new Response(JSON.stringify({ token: "tok" }), { status: 200 });
      }

      // Events list meta + page (totalItems = 0 → no pages)
      if (url.includes("/api/v1/events")) {
        return new Response(
          JSON.stringify({ totalItems: 0, member: [] }),
          { status: 200 },
        );
      }

      return new Response("not found", { status: 404 });
    });

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

      // Events list — one event on one page
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

      // Local event existence check — not yet imported
      if (url.includes("/api/v1/event?old_id=")) {
        return new Response(JSON.stringify([]), { status: 200 });
      }

      // Local production existence check — not yet imported
      if (url.includes("/api/v1/production?old_id=")) {
        return new Response(
          JSON.stringify({ items: [], total: 0 }),
          { status: 200 },
        );
      }

      // Viernulvier production fetch
      if (url.includes("/api/v1/productions/10")) {
        return new Response(
          JSON.stringify({
            "@id": "/api/v1/productions/10",
            title: { nl: "Test Voorstelling" },
          }),
          { status: 200 },
        );
      }

      // Local hall existence check — not yet imported
      if (url.includes("/api/v1/hall?old_id=")) {
        return new Response(JSON.stringify([]), { status: 200 });
      }

      // Viernulvier hall fetch
      if (url.includes("/api/v1/halls/5")) {
        return new Response(
          JSON.stringify({ "@id": "/api/v1/halls/5", name: "Grote Zaal" }),
          { status: 200 },
        );
      }

      // Local image lookup, gallery fetch, tag type fetch — return safe empties
      if (url.includes("/api/v1/image")) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (url.includes("/api/v1/tag")) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (url.includes("media_gallery") || url.includes("/api/v1/galleries")) {
        return new Response(JSON.stringify({ items: [] }), { status: 200 });
      }

      // POST production, hall, event
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
});
