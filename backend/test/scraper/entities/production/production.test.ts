import {
  describe,
  expect,
  it,
  vi,
  beforeEach,
  afterEach,
} from "vitest";

import type { ProductionJSON } from "@/scraper/entities/production/production.js";

import {
  hasImportableProductionTitle,
  scrapeProductionById,
  scrapeAllProductions,
} from "@/scraper/entities/production/production.js";

const BASE_PRODUCTION: ProductionJSON = {
  "@id": "/api/v1/productions/123",
  title: { nl: "Show" },
};

function jsonOk(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function textResponse(body: string, status: number): Response {
  return new Response(body, { status });
}

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("hasImportableProductionTitle", () => {
  it("returns true when title has a valid nl entry", () => {
    const p = {
      "@id": "/api/v1/productions/1",
      title: { nl: "De Voorstelling" },
    } satisfies ProductionJSON;

    expect(hasImportableProductionTitle(p)).toBe(true);
  });

  it("falls back to meta_title when title is absent", () => {
    const p = {
      "@id": "/api/v1/productions/2",
      meta_title: { en: "Some Show" },
    } satisfies ProductionJSON;

    expect(hasImportableProductionTitle(p)).toBe(true);
  });

  it("falls back to artist when title and meta_title are absent", () => {
    const p = {
      "@id": "/api/v1/productions/3",
      artist: { nl: "Kunstenaar" },
    } satisfies ProductionJSON;

    expect(hasImportableProductionTitle(p)).toBe(true);
  });

  it("returns false when all three are absent", () => {
    const p = {
      "@id": "/api/v1/productions/4",
    } satisfies ProductionJSON;

    expect(hasImportableProductionTitle(p)).toBe(false);
  });

  it("returns false when title maps are empty", () => {
    const p = {
      "@id": "/api/v1/productions/5",
      title: {},
      meta_title: {},
      artist: {},
    } satisfies ProductionJSON;

    expect(hasImportableProductionTitle(p)).toBe(false);
  });
});

describe("scrapeProductionById", () => {
  it("returns existing production id when already imported", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url =
        typeof input === "string"
          ? input
          : (input as Request).url;

      if (url.includes("/api/v1/production?")) {
        return jsonOk({
          items: [{ id: 999 }],
          total: 1,
        });
      }

      return jsonOk({});
    });

    const result = await scrapeProductionById(123, "auth", "jwt");

    expect(result).toBe(999);
  });

  it("returns null when remote production is 404", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url =
        typeof input === "string"
          ? input
          : (input as Request).url;

      if (url.includes("/api/v1/production?")) {
        return jsonOk({
          items: [],
          total: 0,
        });
      }

      if (url.includes("/productions/123")) {
        return textResponse("Not found", 404);
      }

      return jsonOk({});
    });

    const result = await scrapeProductionById(123, "auth", "jwt");

    expect(result).toBeNull();
  });

  it("returns null on non-404 fetch failure", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url =
        typeof input === "string"
          ? input
          : (input as Request).url;

      if (url.includes("/api/v1/production?")) {
        return jsonOk({
          items: [],
          total: 0,
        });
      }

      if (url.includes("/productions/123")) {
        return textResponse("Server error", 500);
      }

      return jsonOk({});
    });

    const result = await scrapeProductionById(123, "auth", "jwt");

    expect(result).toBeNull();
  });

  it("returns null when production has no importable title", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url =
        typeof input === "string"
          ? input
          : (input as Request).url;

      if (url.includes("/api/v1/production?")) {
        return jsonOk({
          items: [],
          total: 0,
        });
      }

      if (url.includes("/productions/123")) {
        return jsonOk({
          "@id": "/api/v1/productions/123",
        });
      }

      return jsonOk({});
    });

    const result = await scrapeProductionById(123, "auth", "jwt");

    expect(result).toBeNull();
  });

  it("creates a production successfully", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : (input as Request).url;

      const method = init?.method ?? "GET";

      if (url.includes("/api/v1/production?")) {
        return jsonOk({
          items: [],
          total: 0,
        });
      }

      if (
        url.includes("/productions/123") &&
        method === "GET"
      ) {
        return jsonOk(BASE_PRODUCTION);
      }

      if (
        url.endsWith("/api/v1/production") &&
        method === "POST"
      ) {
        return jsonOk({ id: 555 }, 201);
      }

      return jsonOk({});
    });

    const result = await scrapeProductionById(
      123,
      "auth",
      "jwt",
    );

    expect(result).toBe(555);
  });

  it("returns null when local create fails", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : (input as Request).url;

      const method = init?.method ?? "GET";

      if (url.includes("/api/v1/production?")) {
        return jsonOk({
          items: [],
          total: 0,
        });
      }

      if (url.includes("/productions/123")) {
        return jsonOk(BASE_PRODUCTION);
      }

      if (
        url.endsWith("/api/v1/production") &&
        method === "POST"
      ) {
        return textResponse("Bad request", 400);
      }

      return jsonOk({});
    });

    const result = await scrapeProductionById(
      123,
      "auth",
      "jwt",
    );

    expect(result).toBeNull();
  });

  it("throws when duplicate local productions exist", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      jsonOk({
        items: [{ id: 1 }, { id: 2 }],
        total: 2,
      }),
    );

    await expect(
      scrapeProductionById(123, "auth", "jwt"),
    ).rejects.toThrow(
      "Multiple productions found with old_id 123",
    );
  });
});

describe("scrapeAllProductions", () => {
  it("processes all pages", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : (input as Request).url;

      const method = init?.method ?? "GET";

      if (url.includes("/api/token/scraper")) {
        return jsonOk({ token: "jwt" });
      }

      if (
        url.includes("/api/v1/productions?page=1") &&
        method === "GET"
      ) {
        return jsonOk({
          totalItems: 1,
          member: [BASE_PRODUCTION],
          view: {
            last: "/api/v1/productions?page=1",
          },
        });
      }

      if (url.includes("/api/v1/production?")) {
        return jsonOk({
          items: [],
          total: 0,
        });
      }

      if (url.includes("/api/v1/tag/type")) {
        return jsonOk([
          {
            id: 1,
            name: {
              nl: "genre",
              en: "genre",
              fr: "genre",
            },
          },
          {
            id: 2,
            name: {
              nl: "tag",
              en: "tag",
              fr: "tag",
            },
          },
        ]);
      }

      if (
        url.endsWith("/api/v1/production") &&
        method === "POST"
      ) {
        return jsonOk({ id: 999 }, 201);
      }

      return jsonOk({});
    });

    await expect(
      scrapeAllProductions("auth"),
    ).resolves.toBeUndefined();
  });
});