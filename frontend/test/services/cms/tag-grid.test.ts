import { describe, expect, it } from "vitest";
import type { Tag, TagType } from "@viernulvier/shared";
import {
  applyUpdatedTagToRow,
  buildTagGridRow,
  buildTagGridRows,
} from "@/services/cms";
import type { LanguageMap } from "@/utils/language-utils";

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
