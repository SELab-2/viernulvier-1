import { describe, expect, it } from "vitest";
import type { Event as ArchiveEvent, ProductionWithBackwardsRefs, Tag, TagType } from "@viernulvier/shared";
import {
  buildEventGridRows,
  buildProductionGridRow,
  buildProductionGridRows,
  getBulkTargetRows,
} from "@/services/cms/grid";
import { buildTagGridRow, buildTagGridRows, applyUpdatedTagToRow, applyUpdatedProductionToRow } from "@/services/cms/grid";
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
    tags: tags as number[],
    events: events as number[],
    blogposts: [],
  } as ProductionWithBackwardsRefs;
}

function buildTag(id: number, tagType: number, name: Record<string, string> | null): Tag {
  return {
    id,
    old_id: null,
    name: name,
    tag_type: tagType,
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

    expect(row.genres).toBe(1);
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
    expect(rows[0]?.genres).toBe(0);
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

  it("builds production row with localized text and split tag labels", () => {
    const tag1 = { id: 1, name: { nl: "Genre" }, tag_type: 1 } as unknown as Tag;
    const tag2 = { id: 2, name: { nl: "Hidden" }, tag_type: 2 } as unknown as Tag;
    const tagById = new Map<number, Tag>([
      [1, tag1],
      [2, tag2],
    ]);

    const production = {
      id: 5,
      artist: { nl: "Artist" },
      title: { nl: "Title" },
      supertitle: { nl: "Series" },
      teaser: { nl: "Teaser" },
      description: { nl: "Desc1" },
      description_2: { nl: "Desc2" },
      video_1: { nl: "Media" },
      tags: [1, 2],
      events: ["10", { id: 11 }],
    } as unknown as ProductionWithBackwardsRefs;

    const row = buildProductionGridRow(production, tagById, new Set([1]), (map) => map?.nl ?? "");

    expect(row.id).toBe(5);
    expect(row.performer).toBe("Artist");
    expect(row.title).toBe("Title");
    expect(row.producer).toBe("Series");
    expect(row.genres).toBe(1);
    expect(row.tags).toBe("Hidden");
    expect(row.descriptionOne).toBe("Desc1");
    expect(row.descriptionTwo).toBe("Desc2");
    expect(row.media).toBe("Media");
    expect(row.events).toEqual([10, 11]);
  });

  it("uses dash placeholders when production has no tags", () => {
    const production = {
      id: 9,
      artist: null,
      title: null,
      supertitle: null,
      teaser: null,
      description: null,
      description_2: null,
      video_1: null,
      tags: [],
      events: [],
    } as unknown as ProductionWithBackwardsRefs;

    const row = buildProductionGridRow(production, new Map(), new Set([1]), () => "");

    expect(row.genres).toBe(0);
    expect(row.tags).toBe("-");
  });

  it("builds sorted event grid rows with hall localization and fallback", () => {
    const events = [
      {
        id: 2,
        starts_at: "2026-01-02T20:00:00.000Z",
        ends_at: "2026-01-02T22:00:00.000Z",
        doors_at: "2026-01-02T19:30:00.000Z",
        hall: 99,
        info: null,
      },
      {
        id: 1,
        starts_at: "2026-01-01T20:00:00.000Z",
        ends_at: "2026-01-01T22:00:00.000Z",
        doors_at: "2026-01-01T19:30:00.000Z",
        hall: 1,
        info: { nl: "info" },
      },
    ] as unknown as ArchiveEvent[];

    const rows = buildEventGridRows(
      events,
      new Map([[1, { name: { nl: "Main Hall" } }]]),
      (map) => map?.nl ?? "",
      "N/A",
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]?.id).toBe(1);
    expect(rows[0]?.location).toBe("Main Hall");
    expect(rows[0]?.infoNl).toBe("info");
    expect(rows[1]?.location).toBe("Hall #99");
    expect(rows[0]?.price).toBe("N/A");
  });

  it("builds tag grid rows and applies tag updates", () => {
    const tag = { id: 3, name: { nl: "TagName" }, tag_type: 7, public: true, productions: [1, 2] } as unknown as Tag;
    const tagType = { id: 7, name: { nl: "TagTypeName" } } as unknown as TagType;
    const row = buildTagGridRow(tag, new Map(), (m) => m?.nl ?? "");
    expect(row.tagType).toBe("#7");
    expect(row.productions.length).toBe(2);

    const rows = buildTagGridRows([tag], [tagType], (m) => m?.nl ?? "");
    expect(rows[0].tagType).toBe("TagTypeName");

    const updatedTag = { id: 3, name: { nl: "NewName" }, tag_type: 7, public: false } as unknown as Tag;
    const map = new Map<number, TagType>([[7, tagType]]);
    const mutable = { ...row };
    applyUpdatedTagToRow(mutable as any, updatedTag, map, (m) => m?.nl ?? "");
    expect(mutable.name).toBe("NewName");
    expect(mutable.public).toBe(false);
  });

  it("applyUpdatedProductionToRow updates production row fields", () => {
    const prod = {
      id: 20,
      artist: { nl: "A" },
      title: { nl: "T" },
      supertitle: { nl: "S" },
      teaser: { nl: "Te" },
      description: { nl: "D1" },
      description_2: { nl: "D2" },
      video_1: { nl: "V1" },
      video_2: { nl: "V2" },
      events: [],
      tags: [],
    } as unknown as ProductionWithBackwardsRefs;

    const row = buildProductionGridRow(prod, new Map(), new Set(), (m) => m?.nl ?? "");
    const updated = { ...prod, title: { nl: "T2" }, supertitle: { nl: "S2" } } as unknown as ProductionWithBackwardsRefs;
    applyUpdatedProductionToRow(row as any, updated as any, (m) => m?.nl ?? "");
    expect(row.title).toBe("T2");
    expect(row.producer).toBe("S2");
  });
});
