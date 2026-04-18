import { describe, expect, it } from "vitest";
import type { Tag, TagType } from "@viernulvier/shared";
import { buildCmsTagGroups } from "@/services/cms/tags";

function buildTagType(id: number, name: string): TagType {
  return {
    id,
    name: { nl: name },
  };
}

function buildTag(id: number, tag_type: number | string, name: string): Tag {
  return {
    id,
    old_id: null,
    name: { nl: name },
    tag_type: tag_type as never,
    public: true,
  };
}

describe("buildCmsTagGroups", () => {
  it("orders genre groups first and sorts tags within each group", () => {
    const groups = buildCmsTagGroups(
      [
        buildTag(20, 2, "Beta"),
        buildTag(10, 1, "Zulu"),
        buildTag(11, 1, "Alpha"),
      ],
      [buildTagType(1, "Genre"), buildTagType(2, "Theme")],
      (map) => map?.nl ?? "",
    );

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ tagTypeId: 1, isGenre: true });
    expect(groups[0]?.tags.map((tag) => tag.label)).toEqual(["Alpha", "Zulu"]);
    expect(groups[1]).toMatchObject({ tagTypeId: 2, isGenre: false });
  });

  it("falls back to tag type and tag ids when localization is empty", () => {
    const groups = buildCmsTagGroups(
      [buildTag(5, 3, "Hidden")],
      [buildTagType(3, ""), buildTagType(4, "Genre")],
      () => "",
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      tagTypeId: 3,
      label: "Tag type #3",
      isGenre: false,
    });
    expect(groups[0]?.tags).toEqual([{ id: 5, label: "Tag #5" }]);
  });

  it("ignores tags with non-numeric tag types", () => {
    const groups = buildCmsTagGroups(
      [buildTag(1, "nope", "Broken")],
      [buildTagType(1, "Genre")],
      (map) => map?.nl ?? "",
    );

    expect(groups).toEqual([]);
  });

  it("treats the plural genre label as genre too", () => {
    const groups = buildCmsTagGroups(
      [buildTag(1, 1, "Alpha")],
      [buildTagType(1, "Genres")],
      (map) => map?.nl ?? "",
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      tagTypeId: 1,
      isGenre: true,
    });
  });

  it("detects genre from another translation when localized label is different", () => {
    const groups = buildCmsTagGroups(
      [buildTag(1, 1, "Alpha")],
      [{ id: 1, name: { nl: "Thema", en: "Genre" } } as TagType],
      (map) => map?.nl ?? "",
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      tagTypeId: 1,
      label: "Thema",
      isGenre: true,
    });
  });
});