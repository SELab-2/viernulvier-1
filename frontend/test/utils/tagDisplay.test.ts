import { describe, it, expect } from "vitest";
import type { TagType } from "@viernulvier/shared";
import { tagTypeIsGenre } from "@/utils/tagDisplay";

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
  });
});
