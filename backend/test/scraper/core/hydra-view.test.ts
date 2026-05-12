import { describe, expect, it } from "vitest";

import {
  hydraIriString,
  parseHydraLastPageIndex,
  resolveViernulvierResourceUrl,
  totalPagesFromHydraView,
} from "@/scraper/core/hydra-view.js";

describe("hydraIriString", () => {
  it("returns the string as-is when already a string", () => {
    expect(hydraIriString("/api/v1/halls/5")).toBe("/api/v1/halls/5");
  });

  it("extracts @id from an object", () => {
    expect(hydraIriString({ "@id": "/api/v1/genres/3" })).toBe("/api/v1/genres/3");
  });

  it("returns null for null / undefined / empty string", () => {
    expect(hydraIriString(null)).toBeNull();
    expect(hydraIriString(undefined)).toBeNull();
    expect(hydraIriString("")).toBeNull();
    expect(hydraIriString("   ")).toBeNull();
  });

  it("returns null for an object with a non-string @id", () => {
    expect(hydraIriString({ "@id": 42 })).toBeNull();
  });

  it("returns null for an object without @id", () => {
    expect(hydraIriString({ name: "something" })).toBeNull();
  });

  it("returns null for an object with an empty @id string", () => {
    expect(hydraIriString({ "@id": "   " })).toBeNull();
  });
});

describe("resolveViernulvierResourceUrl", () => {
  it("returns absolute URLs unchanged", () => {
    expect(
      resolveViernulvierResourceUrl("https://www.viernulvier.gent/api/v1/halls/1"),
    ).toBe("https://www.viernulvier.gent/api/v1/halls/1");
  });

  it("prepends origin to path-only IRIs with leading slash", () => {
    expect(resolveViernulvierResourceUrl("/api/v1/halls/1")).toBe(
      "https://www.viernulvier.gent/api/v1/halls/1",
    );
  });

  it("prepends origin and adds slash to paths without leading slash", () => {
    expect(resolveViernulvierResourceUrl("api/v1/halls/1")).toBe(
      "https://www.viernulvier.gent/api/v1/halls/1",
    );
  });
});

describe("parseHydraLastPageIndex", () => {
  it("parses page from absolute IRI", () => {
    expect(
      parseHydraLastPageIndex("https://www.viernulvier.gent/api/v1/halls?page=7"),
    ).toBe(7);
  });

  it("returns 1 when page param is absent (single-page collection)", () => {
    expect(
      parseHydraLastPageIndex("https://www.viernulvier.gent/api/v1/halls"),
    ).toBe(1);
  });

  it("returns 1 when page param is empty string", () => {
    expect(
      parseHydraLastPageIndex("https://www.viernulvier.gent/api/v1/halls?page="),
    ).toBe(1);
  });

  it("throws for a page value of 0", () => {
    expect(() =>
      parseHydraLastPageIndex("https://www.viernulvier.gent/api/v1/halls?page=0"),
    ).toThrow("Invalid page query");
  });

  it("resolves a path-only IRI against the default base origin", () => {
    expect(parseHydraLastPageIndex("/api/v1/halls?page=3")).toBe(3);
  });
});

describe("totalPagesFromHydraView", () => {
  it("reads page count from view.last", () => {
    const view = { last: "https://www.viernulvier.gent/api/v1/halls?page=4" };
    expect(totalPagesFromHydraView(view, 100)).toBe(4);
  });

  it("falls back to view.first when view.last is absent", () => {
    const view = { first: "https://www.viernulvier.gent/api/v1/halls?page=1" };
    expect(totalPagesFromHydraView(view, 15)).toBe(1);
  });

  it("returns 0 for empty collections", () => {
    expect(totalPagesFromHydraView(undefined, 0)).toBe(0);
  });

  it("returns 0 for non-finite totalItems", () => {
    expect(totalPagesFromHydraView(undefined, NaN)).toBe(0);
    expect(totalPagesFromHydraView(undefined, Infinity)).toBe(0);
  });

  it("falls back to ceiling division when view is absent", () => {
    // DEFAULT_HYDRA_PAGE_SIZE = 30; 75 items → 3 pages
    expect(totalPagesFromHydraView(undefined, 75)).toBe(3);
  });

  it("falls back to ceiling division when view is present but both first and last are empty", () => {
    // 10 items / 30 per page → 1 page
    expect(totalPagesFromHydraView({ first: "", last: "" }, 10)).toBe(1);
  });
});