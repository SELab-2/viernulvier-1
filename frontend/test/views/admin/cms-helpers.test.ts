import { describe, expect, it, vi } from "vitest";
import type { Event as ArchiveEvent, ProductionWithBackwardsRefs, Tag } from "@viernulvier/shared";
import {
  buildEventGridRows,
  buildProductionGridRow,
  emptyLangRecord,
  extractEventIds,
  makeEditorValues,
  toIsoStringFromLocalInput,
  toLocalDateTimeInput,
} from "@/services/cms";

const collectProductionTagsByIdMapMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/productions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/productions")>();
  return {
    ...actual,
    collectProductionTagsByIdMap: collectProductionTagsByIdMapMock,
  };
});

describe("cms-helpers", () => {
  it("returns an empty language record", () => {
    expect(emptyLangRecord()).toEqual({ nl: "", fr: "", en: "" });
  });

  it("extracts event ids from mixed references", () => {
    const ids = extractEventIds([1, "2", { id: 3 }, { id: "4" }, null, { id: "x" }]);
    expect(ids).toEqual([1, 2, 3, 4]);
  });

  it("formats local date input and handles invalid values", () => {
    expect(toLocalDateTimeInput("not-a-date")).toBe("");

    const output = toLocalDateTimeInput("2026-01-01T12:34:00.000Z");
    expect(output).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("converts local datetime input to ISO string", () => {
    const input = "2026-04-13T10:30";
    expect(toIsoStringFromLocalInput(input)).toBe(new Date(input).toISOString());
  });

  it("maps editor values with defaults", () => {
    expect(makeEditorValues(undefined)).toEqual({ nl: "", fr: "", en: "" });
    expect(makeEditorValues({ nl: "x" })).toEqual({ nl: "x", fr: "", en: "" });
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

  it("builds production row with localized text and split tag labels", () => {
    const tag1 = { id: 1, name: { nl: "Genre" }, tag_type: 1 } as unknown as Tag;
    const tag2 = { id: 2, name: { nl: "Hidden" }, tag_type: 2 } as unknown as Tag;
    collectProductionTagsByIdMapMock.mockReturnValue([tag1, tag2]);

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

    const row = buildProductionGridRow(production, new Map(), new Set([1]), (map) => map?.nl ?? "");

    expect(collectProductionTagsByIdMapMock).toHaveBeenCalledWith(production, expect.any(Map));
    expect(row.id).toBe(5);
    expect(row.performer).toBe("Artist");
    expect(row.title).toBe("Title");
    expect(row.producer).toBe("Series");
    expect(row.genres).toBe("Genre");
    expect(row.tags).toBe("Hidden");
    expect(row.descriptionOne).toBe("Desc1");
    expect(row.descriptionTwo).toBe("Desc2");
    expect(row.media).toBe("Media");
    expect(row.events).toEqual([10, 11]);
  });

  it("uses dash placeholders when no tag labels are available", () => {
    collectProductionTagsByIdMapMock.mockReturnValue([]);

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

    expect(row.genres).toBe("-");
    expect(row.tags).toBe("-");
  });
});
