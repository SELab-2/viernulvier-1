import { describe, expect, it, vi, afterEach } from "vitest";

import {
  rememberViernulvierProductionJson,
  syncProductionGenreTagsWithPayload,
} from "@/scraper/entities/production/production-tags.js";
import { createEmptyRunStats } from "@/scraper/core/scrape-stats.js";

describe("rememberViernulvierProductionJson + syncProductionGenreTagsWithPayload", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("syncs without error when the production has no genres", async () => {
    const production = { "@id": "/api/v1/productions/1" };
    rememberViernulvierProductionJson(1, production);

    // Tag types endpoint
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    // POST tag/type for "genre" and "tag" bootstrap
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = (init as RequestInit | undefined)?.method ?? "GET";

      if (url.includes("/api/v1/tag/type")) {
        if (method === "GET") return new Response(JSON.stringify([]), { status: 200 });
        return new Response(JSON.stringify({ id: 1, name: { nl: "genre", en: "genre", fr: "genre" } }), { status: 201 });
      }

      return new Response("not found", { status: 404 });
    });

    const stats = createEmptyRunStats();
    await expect(
      syncProductionGenreTagsWithPayload(
        100,
        production,
        "auth-token",
        "login-token",
        stats,
      ),
    ).resolves.toBeUndefined();

    // No genres → nothing skipped either
    expect(stats.tags.genresSkipped).toBe(0);
  });

  it("increments genresSkipped for an invalid genre IRI", async () => {
    const production = {
      "@id": "/api/v1/productions/2",
      genres: ["/not-a-genre-iri/abc"],
    };

    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = (init as RequestInit | undefined)?.method ?? "GET";

      if (url.includes("/api/v1/tag/type")) {
        if (method === "GET") return new Response(JSON.stringify([]), { status: 200 });
        return new Response(JSON.stringify({ id: 1, name: { nl: "genre", en: "genre", fr: "genre" } }), { status: 201 });
      }

      return new Response("not found", { status: 404 });
    });

    const stats = createEmptyRunStats();
    await syncProductionGenreTagsWithPayload(
      101,
      production,
      "auth-token",
      "login-token",
      stats,
    );

    expect(stats.tags.genresSkipped).toBeGreaterThan(0);
  });
});
