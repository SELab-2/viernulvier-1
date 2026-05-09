import { describe, expect, it } from "vitest";

import {
  hydraIriString,
  parseHydraLastPageIndex,
  resolveViernulvierResourceUrl,
  totalPagesFromHydraView,
} from "@/scraper/hydra-view.js";

describe("hydraIriString", () => {
  it("returns the string as-is when already a string", () => {
    expect(hydraIriString("/api/v1/halls/5")).toBe("/api/v1/halls/5");
  });

  it("extracts @id from an object", () => {
    expect(hydraIriString({ "@id": "/api/v1/genres/3" })).toBe(
      "/api/v1/genres/3",
    );
  });

  it("returns null for null / undefined / empty string", () => {
    expect(hydraIriString(null)).toBeNull();
    expect(hydraIriString(undefined)).toBeNull();
    expect(hydraIriString("")).toBeNull();
    expect(hydraIriString("   ")).toBeNull();
  });
});

describe("resolveViernulvierResourceUrl", () => {
  it("returns absolute URLs unchanged", () => {
    expect(
      resolveViernulvierResourceUrl("https://www.viernulvier.gent/api/v1/halls/1"),
    ).toBe("https://www.viernulvier.gent/api/v1/halls/1");
  });

  it("prepends origin to path-only IRIs", () => {
    expect(resolveViernulvierResourceUrl("/api/v1/halls/1")).toBe(
      "https://www.viernulvier.gent/api/v1/halls/1",
    );
  });
});

describe("parseHydraLastPageIndex", () => {
  it("parses page from absolute IRI", () => {
    expect(
      parseHydraLastPageIndex(
        "https://www.viernulvier.gent/api/v1/halls?page=7",
      ),
    ).toBe(7);
  });

  it("returns 1 when page param is absent (single-page collection)", () => {
    expect(
      parseHydraLastPageIndex("https://www.viernulvier.gent/api/v1/halls"),
    ).toBe(1);
  });
});

describe("totalPagesFromHydraView", () => {
  it("reads page count from view.last", () => {
    const view = {
      last: "https://www.viernulvier.gent/api/v1/halls?page=4",
    };
    expect(totalPagesFromHydraView(view, 100)).toBe(4);
  });

  it("returns 0 for empty collections", () => {
    expect(totalPagesFromHydraView(undefined, 0)).toBe(0);
  });

  it("falls back to ceiling division when view is absent", () => {
    // DEFAULT_HYDRA_PAGE_SIZE = 30; 75 items → 3 pages
    expect(totalPagesFromHydraView(undefined, 75)).toBe(3);
  });
});
