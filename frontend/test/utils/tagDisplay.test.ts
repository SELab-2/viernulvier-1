import { describe, it, expect } from "vitest";
import type { TagType } from "@viernulvier/shared";
import {
  sortProductionTagChipsGenresFirst,
  tagTypeIsGenre,
} from "@/utils/tagDisplay";

describe("tagDisplay", () => {
  it("detects Genre from localized names", () => {
    expect(
      tagTypeIsGenre({ id: 1, name: { nl: "Genre" } } as TagType),
    ).toBe(true);
    expect(
      tagTypeIsGenre({ id: 1, name: { en: "GENRES" } } as TagType),
    ).toBe(true);
    expect(tagTypeIsGenre({ id: 1, name: { nl: "Tag" } } as TagType)).toBe(
      false,
    );
    expect(tagTypeIsGenre(undefined)).toBe(false);
    expect(tagTypeIsGenre({ id: 1, name: {} } as TagType)).toBe(false);
  });

  it("sorts production tag chips with genres first", () => {
    expect(
      sortProductionTagChipsGenresFirst([
        { tagId: 1, label: "Drama", isGenre: false },
        { tagId: 2, label: "Theater", isGenre: true },
        { tagId: 3, label: "Festival", isGenre: false },
      ]).map((c) => c.tagId),
    ).toEqual([2, 1, 3]);
  });
});
