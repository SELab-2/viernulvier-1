import { describe, expect, it } from "vitest";

import {
  hasImportableProductionTitle,
  type ProductionJSON,
} from "@/scraper/entities/production/production.js";

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
    const p = { "@id": "/api/v1/productions/4" } satisfies ProductionJSON;
    expect(hasImportableProductionTitle(p)).toBe(false);
  });
});
