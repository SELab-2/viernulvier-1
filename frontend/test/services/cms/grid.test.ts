import { describe, expect, it } from "vitest";
import type { Event as ArchiveEvent, ProductionWithBackwardsRefs, Tag, TagType, BlogPostWithBackwardsRefs, Admin } from "@viernulvier/shared";
import {
  buildEventGridRows,
  buildProductionGridRow,
  buildProductionGridRows,
  getBulkTargetRows,
  buildTagGridRow,
  buildTagGridRows,
  applyUpdatedTagToRow,
  applyUpdatedProductionToRow,
  buildBlogPostGridRow,
  buildBlogPostGridRows,
  applyUpdatedBlogPostToRow,
  buildTagTypeGridRow,
  buildTagTypeGridRows,
  applyUpdatedTagTypeToRow,
  buildAdminGridRow,
  buildAdminGridRows,
  applyUpdatedAdminToRow,
  buildEmptyAdminForm,
} from "@/services/cms/grid";
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

  it("handles tag with non-array productions", () => {
    const tag = { id: 5, name: { nl: "Tag" }, tag_type: 1, public: true, productions: null } as unknown as Tag;
    const row = buildTagGridRow(tag, new Map(), (m) => m?.nl ?? "");
    expect(row.productions).toEqual([]);
  });

  it("builds blog post grid rows with published_at and content", () => {
    const blogpost = {
      id: 1,
      title: { nl: "Post Title" },
      content: { nl: "Post Content" },
      published_at: "2026-01-15T10:00:00Z",
      productions: [1, 2, 3],
    } as unknown as BlogPostWithBackwardsRefs;

    const row = buildBlogPostGridRow(blogpost, (m) => m?.nl ?? "");
    expect(row.id).toBe(1);
    expect(row.title).toBe("Post Title");
    expect(row.content).toBe("Post Content");
    expect(row.publishedAt).toBe("2026-01-15T10:00:00.000Z");
    expect(row.productions).toEqual([1, 2, 3]);
  });

  it("builds blog post row with null published_at", () => {
    const blogpost = {
      id: 2,
      title: { nl: "Draft" },
      content: { nl: "Content" },
      published_at: null,
      productions: [],
    } as unknown as BlogPostWithBackwardsRefs;

    const row = buildBlogPostGridRow(blogpost, (m) => m?.nl ?? "");
    expect(row.publishedAt).toBeNull();
  });

  it("builds multiple blog post grid rows", () => {
    const blogposts = [
      {
        id: 1,
        title: { nl: "First" },
        content: { nl: "Content1" },
        published_at: "2026-01-01T00:00:00Z",
        productions: [1],
      },
      {
        id: 2,
        title: { nl: "Second" },
        content: { nl: "Content2" },
        published_at: null,
        productions: [],
      },
    ] as unknown as BlogPostWithBackwardsRefs[];

    const rows = buildBlogPostGridRows(blogposts, (m) => m?.nl ?? "");
    expect(rows).toHaveLength(2);
    expect(rows[0]?.title).toBe("First");
    expect(rows[1]?.title).toBe("Second");
    expect(rows[1]?.publishedAt).toBeNull();
  });

  it("applies updated blog post to row", () => {
    const blogpost = {
      id: 3,
      title: { nl: "Original" },
      content: { nl: "Original Content" },
      published_at: null,
      productions: [1],
    } as unknown as BlogPostWithBackwardsRefs;

    const row = buildBlogPostGridRow(blogpost, (m) => m?.nl ?? "");
    const updated = {
      ...blogpost,
      title: { nl: "Updated" },
      content: { nl: "Updated Content" },
    } as unknown as BlogPostWithBackwardsRefs;

    applyUpdatedBlogPostToRow(row, updated, (m) => m?.nl ?? "");
    expect(row.title).toBe("Updated");
    expect(row.content).toBe("Updated Content");
  });

  it("builds tag type grid row", () => {
    const tagType = { id: 10, name: { nl: "Genre" } } as unknown as TagType;
    const tag1 = { id: 1, tag_type: 10 } as unknown as Tag;
    const tag2 = { id: 2, tag_type: 10 } as unknown as Tag;
    const tagsByType = new Map([[10, [tag1, tag2]]]);

    const row = buildTagTypeGridRow(tagType, tagsByType, (m) => m?.nl ?? "");
    expect(row.id).toBe(10);
    expect(row.name).toBe("Genre");
    expect(row.tagCount).toBe(2);
    expect(row.tags).toEqual([1, 2]);
  });

  it("builds tag type grid rows with non-finite typeId handling", () => {
    const tagTypes = [
      { id: 1, name: { nl: "Type1" } },
      { id: 2, name: { nl: "Type2" } },
    ] as unknown as TagType[];

    const tags = [
      { id: 1, tag_type: 1 },
      { id: 2, tag_type: 2 },
      { id: 3, tag_type: NaN },
    ] as unknown as Tag[];

    const rows = buildTagTypeGridRows(tagTypes, tags, (m) => m?.nl ?? "");
    expect(rows).toHaveLength(2);
    expect(rows[0]?.tagCount).toBe(1);
    expect(rows[1]?.tagCount).toBe(1);
  });

  it("applies updated tag type to row", () => {
    const tagType = { id: 5, name: { nl: "Original" } } as unknown as TagType;
    const tag = { id: 1, tag_type: 5 } as unknown as Tag;
    const row = buildTagTypeGridRow(tagType, new Map([[5, [tag]]]), (m) => m?.nl ?? "");

    const updated = { id: 5, name: { nl: "Updated" } } as unknown as TagType;
    applyUpdatedTagTypeToRow(row, updated, (m) => m?.nl ?? "");
    expect(row.name).toBe("Updated");
  });

  it("builds admin grid row", () => {
    const admin = { id: 1, username: "admin1", super: true } as unknown as Admin;
    const row = buildAdminGridRow(admin);
    expect(row.id).toBe(1);
    expect(row.username).toBe("admin1");
    expect(row.super).toBe(true);
  });

  it("builds multiple admin grid rows", () => {
    const admins = [
      { id: 1, username: "admin1", super: true },
      { id: 2, username: "admin2", super: false },
    ] as unknown as Admin[];

    const rows = buildAdminGridRows(admins);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.username).toBe("admin1");
    expect(rows[1]?.super).toBe(false);
  });

  it("applies updated admin to row", () => {
    const admin = { id: 1, username: "original", super: true } as unknown as Admin;
    const row = buildAdminGridRow(admin);

    const updated = { id: 1, username: "updated", super: false } as unknown as Admin;
    applyUpdatedAdminToRow(row, updated);
    expect(row.username).toBe("updated");
    expect(row.super).toBe(false);
  });

  it("builds empty admin form", () => {
    const form = buildEmptyAdminForm();
    expect(form.username).toBe("");
    expect(form.password).toBe("");
    expect(form.super).toBe(false);
  });

  it("uses video_2 as fallback when video_1 is not available", () => {
    const production = {
      id: 1,
      artist: null,
      title: null,
      supertitle: null,
      teaser: null,
      description: null,
      description_2: null,
      video_1: null,
      video_2: { nl: "Video2URL" },
      tags: [],
      events: [],
    } as unknown as ProductionWithBackwardsRefs;

    const row = buildProductionGridRow(production, new Map(), new Set(), (m) => m?.nl ?? "");
    expect(row.media).toBe("Video2URL");
  });
});
