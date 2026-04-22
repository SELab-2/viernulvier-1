import { describe, expect, it } from "vitest";
import type { ProductionWithBackwardsRefs, Tag, TagType } from "@viernulvier/shared";
import { buildProductionGridRow, buildProductionGridRows, getBulkTargetRows } from "@/services/cms/grid";
import type { CmsProductionGridRow } from "@/services/cms";

function buildProduction(tags: unknown[] = [1], events: unknown[] = []): ProductionWithBackwardsRefs {
  return {
    id: 1,
    old_id: null,
    finalized: true,
    supertitle: null,
    title: { nl: "Voorstelling" },
    artist: { nl: "Artiest" },
    tagline: { nl: "Tagline" },
    teaser: { nl: "Teaser" },
    description: null,
    description_extra: null,
    description_2: null,
    video_1: null,
    video_2: null,
    quote: null,
    quote_source: null,
    programme: null,
    info: null,
    tags: tags as never,
    events: events as never,
  } as ProductionWithBackwardsRefs;
}

function buildTag(id: number, tagType: number, name: Record<string, string> | null): Tag {
  return {
    id,
    old_id: null,
    name: name as never,
    tag_type: tagType as never,
    public: true,
  } as Tag;
}

describe("cms grid helpers", () => {
  it("uses fallback tag localization when localize returns empty", () => {
    const production = buildProduction([1, 2]);
    const tagById = new Map<number, Tag>([
      [1, buildTag(1, 10, { en: "Comedy" })],
      [2, buildTag(2, 20, { fr: "Lezing" })],
    ]);

    const row = buildProductionGridRow(production, tagById, new Set([10]), () => "");

    expect(row.genres).toBe("Comedy");
    expect(row.tags).toBe("Lezing");
  });

  it("handles null maps in fallback localization and non-genre tag type names", () => {
    const rows = buildProductionGridRows(
      [buildProduction([1])],
      [buildTag(1, 55, null)],
      [{ id: 55, name: null } as unknown as TagType],
      () => "",
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.genres).toBe("-");
    expect(rows[0]?.tags).toBe("-");
  });

  it("returns selected rows for bulk edit when primary row is in selection", () => {
    const primary = { id: 1 } as CmsProductionGridRow;
    const other = { id: 2 } as CmsProductionGridRow;

    const result = getBulkTargetRows([primary, other], primary);
    expect(result).toEqual([primary, other]);
  });

  it("falls back to only the primary row when bulk conditions are not met", () => {
    const primary = { id: 1 } as CmsProductionGridRow;
    const other = { id: 2 } as CmsProductionGridRow;

    expect(getBulkTargetRows([], primary)).toEqual([primary]);
    expect(getBulkTargetRows([other], primary)).toEqual([primary]);
  });
});
