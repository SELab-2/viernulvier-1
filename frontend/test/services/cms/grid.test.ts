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
import type { Tag, TagType } from "@viernulvier/shared";
import {
  applyUpdatedTagToRow,
  buildTagGridRow,
  buildTagGridRows,
} from "@/services/cms";
import type { LanguageMap } from "@/utils/i18n";

const localize = (map: LanguageMap | null | undefined): string =>
  map ? (map.en ?? Object.values(map)[0] ?? "") : "";

function makeTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: 1,
    old_id: null,
    name: { en: "Drama" },
    tag_type: 10 as never,
    public: true,
    productions: [] as never,
    ...overrides,
  } as Tag;
}

const knownType: TagType = { id: 10, old_id: null, name: { en: "Genre" } } as TagType;

describe("tag grid builders", () => {
  it("builds a row with resolved tag type and production count", () => {
    const row = buildTagGridRow(
      makeTag({ productions: [1, 2, 3] as never }),
      new Map([[10, knownType]]),
      localize,
    );
    expect(row.tagType).toBe("Genre");
    expect(row.productionCount).toBe(3);
    expect(row.name).toBe("Drama");
  });

  it("falls back to a placeholder when tag type is unknown", () => {
    const row = buildTagGridRow(makeTag({ tag_type: 99 as never }), new Map(), localize);
    expect(row.tagType).toBe("#99");
  });

  it("shows the placeholder when tag type exists but has no localised name", () => {
    const typeWithEmptyName: TagType = { id: 10, old_id: null, name: {} } as TagType;
    const row = buildTagGridRow(makeTag(), new Map([[10, typeWithEmptyName]]), localize);
    expect(row.tagType).toBe("#10");
  });

  it("treats non-array productions as zero", () => {
    const row = buildTagGridRow(
      makeTag({ productions: undefined as never }),
      new Map([[10, knownType]]),
      localize,
    );
    expect(row.productionCount).toBe(0);
  });

  it("uses empty string when tag name is missing", () => {
    const row = buildTagGridRow(
      makeTag({ name: {} as LanguageMap }),
      new Map([[10, knownType]]),
      localize,
    );
    expect(row.name).toBe("");
  });

  it("buildTagGridRows maps the full collection", () => {
    const rows = buildTagGridRows(
      [makeTag({ id: 1 }), makeTag({ id: 2, tag_type: 99 as never })],
      [knownType],
      localize,
    );
    expect(rows).toHaveLength(2);
    expect(rows[1].tagType).toBe("#99");
  });

  it("applyUpdatedTagToRow mutates row in place", () => {
    const row = buildTagGridRow(makeTag(), new Map([[10, knownType]]), localize);
    const updated = makeTag({ id: 1, public: false, name: { en: "Tragedy" } });

    applyUpdatedTagToRow(row, updated, new Map([[10, knownType]]), localize);

    expect(row.public).toBe(false);
    expect(row.name).toBe("Tragedy");
    expect(row.tagType).toBe("Genre");
  });

  it("applyUpdatedTagToRow handles unknown tag type after update", () => {
    const row = buildTagGridRow(makeTag(), new Map([[10, knownType]]), localize);
    const updated = makeTag({ tag_type: 42 as never });

    applyUpdatedTagToRow(row, updated, new Map(), localize);

    expect(row.tagType).toBe("#42");
  });
});
