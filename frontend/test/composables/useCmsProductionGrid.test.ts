import { describe, expect, it, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { useCmsProductionGrid } from "@/composables/useCmsProductionGrid";

describe("useCmsProductionGrid", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("column definitions", () => {
    it("declares twelve production columns including the events action", () => {
      const grid = useCmsProductionGrid({ isDark: ref(false), t: (key) => key });

      expect(grid.columnDefs.value).toHaveLength(12);
      expect(grid.gridColumnOptions.value).toHaveLength(12);
    });

    it("declares twelve production columns including id and events action", () => {
      const grid = useCmsProductionGrid({ isDark: ref(false), t: (key) => key, currentLang: ref('nl') });

      expect(grid.columnDefs.value).toHaveLength(12);
      expect(grid.gridColumnOptions.value).toHaveLength(12);

      const idRenderer = grid.columnDefs.value[0]?.cellRenderer as
        | ((params: { value: number }) => string)
        | undefined;
      expect(idRenderer?.({ value: 42 })).toContain('/nl/productions/42');

      const eventsValueGetter = grid.columnDefs.value.find((def) => def.colId === "eventsAction")?.valueGetter as
        | ((params: unknown) => string)
        | undefined;
      expect(eventsValueGetter?.({})).toBe("View");
    });

    it("truncates long teaser and description values via valueFormatter", () => {
      const defs = useCmsProductionGrid({ isDark: ref(false), t: (key) => key, currentLang: ref('nl') }).columnDefs.value;

      const teaser = defs.find((d) => d.field === "teaser")?.valueFormatter as
        | ((params: { value: unknown }) => string)
        | undefined;
      expect(teaser?.({ value: "short" })).toBe("short");
      expect(teaser?.({ value: "x".repeat(80) })).toBe(`${"x".repeat(47)}...`);

      const descOne = defs.find((d) => d.field === "descriptionOne")?.valueFormatter as
        | ((params: { value: unknown }) => string)
        | undefined;
      expect(descOne?.({ value: null })).toBe("");

      const descTwo = defs.find((d) => d.field === "descriptionTwo")?.valueFormatter as
        | ((params: { value: unknown }) => string)
        | undefined;
      expect(descTwo?.({ value: null })).toBe("");
      expect(descTwo?.({ value: "x".repeat(80) })).toBe(`${"x".repeat(47)}...`);
    });

    it("renders media cells as escaped truncated text and hides empty values", () => {
      const grid = useCmsProductionGrid({ isDark: ref(false), t: (key) => key, currentLang: ref('nl') });

      const mediaRenderer = grid.columnDefs.value.find((c) => c.field === "media")?.cellRenderer as
        | ((params: { value: unknown }) => string)
        | undefined;

      const imageRenderer = grid.columnDefs.value.find((c) => c.field === "imageMedia")?.cellRenderer as
        | ((params: { data?: { imageMediaUrls?: string[] } }) => string)
        | undefined;

      expect(mediaRenderer?.({ value: "https://example.com/cover.jpg" } as never)).toContain("cms-media-text");
      expect(
        mediaRenderer?.({ value: `https://example.com/a & b<'">.jpg` } as never),
      ).toContain("https://example.com/a &amp; b&lt;&#39;&quot;&gt;.jpg");
      expect(mediaRenderer?.({ value: "" } as never)).toBe("");
      expect(mediaRenderer?.({ value: "   " } as never)).toBe("");
      expect(mediaRenderer?.({ value: null } as never)).toBe("");

      expect(imageRenderer?.({ data: undefined })).toBe("");
      expect(imageRenderer?.({ data: { imageMediaUrls: [] } })).toBe("");
      expect(imageRenderer?.({ data: { imageMediaUrls: ["https://example.com/a.jpg"] } })).toContain(
        "cms.create.media.imageCountOne",
      );
      expect(
        imageRenderer?.({ data: { imageMediaUrls: ["a", "b"] } }),
      ).toContain("cms.create.media.imageCountOther");
    });

    it("uses primary tag labels as genre editor values with empty fallback", () => {
      const withLabels = useCmsProductionGrid({
        isDark: ref(false),
        t: (key) => key,
        currentLang: ref('nl'),
        getGenreLabels: () => ["Genre A", "Genre B"],
      });
      const withParams = withLabels.columnDefs.value.find((c) => c.field === "genres")?.cellEditorParams as
        | (() => { values: string[] })
        | undefined;
      expect(withParams?.().values).toEqual(["Genre A", "Genre B"]);
      const withValueFormatter = withLabels.columnDefs.value.find((c) => c.field === "genres")?.valueFormatter as
        | ((params: { value: unknown }) => string)
        | undefined;
      expect(withValueFormatter?.({ value: 1 })).toBe("Genre A");

      const withoutLabels = useCmsProductionGrid({ isDark: ref(false), t: (key) => key, currentLang: ref('nl') });
      const withoutParams = withoutLabels.columnDefs.value.find((c) => c.field === "genres")?.cellEditorParams as
        | (() => { values: string[] })
        | undefined;
      expect(withoutParams?.().values).toEqual([0]);

      const withUndefinedLabels = useCmsProductionGrid({
        isDark: ref(false),
        t: (key) => key,
        currentLang: ref("nl"),
        getPrimaryTagLabels: () => undefined as unknown as string[],
      });
      const undefinedLabelsFormatter = withUndefinedLabels.columnDefs.value.find((c) => c.field === "genres")?.valueFormatter as
        | ((params: { value: unknown }) => string)
        | undefined;
      expect(undefinedLabelsFormatter?.({ value: 1 })).toBe("#1");
    });

    it("formats primary tag ids with label and fallback values", () => {
      const grid = useCmsProductionGrid({
        isDark: ref(false),
        t: (key) => key,
        getGenreOptions: () => [{ id: 7, label: "Genre X" }],
      });

      const genresCol = grid.columnDefs.value.find((c) => c.field === "genres");
      const params = genresCol?.cellEditorParams as
        | (() => { values: number[]; formatValue: (value: unknown) => string })
        | undefined;
      expect(params?.().values).toEqual([0, 7]);

      const valueFormatter = genresCol?.valueFormatter as
        | ((params: { value: unknown }) => string)
        | undefined;
      expect(valueFormatter?.({ value: 7 })).toBe("Genre X");
      expect(valueFormatter?.({ value: 0 })).toBe("-");
      expect(valueFormatter?.({ value: Number.NaN })).toBe("-");
      expect(params?.().formatValue(7)).toBe("Genre X");

      const filterValueGetter = genresCol?.filterValueGetter as
        | ((params: { data?: { genres?: unknown } }) => string)
        | undefined;
      expect(filterValueGetter?.({ data: { genres: 7 } })).toBe("Genre X");
    });

    it("uses primary tag options for genre formatting and editor values", () => {
      const grid = useCmsProductionGrid({
        isDark: ref(false),
        t: (key) => key,
        currentLang: ref('nl'),
        getGenreOptions: () => [
          { id: 7, label: "Genre Seven" },
          { id: 9, label: "Genre Nine" },
        ],
      });

      const genreColumn = grid.columnDefs.value.find((c) => c.field === "genres");
      const params = genreColumn?.cellEditorParams as
        | (() => { values: number[]; formatValue: (value: unknown) => string })
        | undefined;

      expect(params?.().values).toEqual([0, 7, 9]);
      expect(params?.().formatValue(7)).toBe("Genre Seven");
      expect(params?.().formatValue(0)).toBe("-");
      expect(params?.().formatValue("  ")).toBe("-");
      expect(params?.().formatValue("Custom" as never)).toBe("Custom");
      expect(params?.().formatValue(99)).toBe("#99");

      const formatter = genreColumn?.valueFormatter as
        | ((params: { value: unknown }) => string)
        | undefined;
      const filterGetter = genreColumn?.filterValueGetter as
        | ((params: { data?: { genres?: unknown } }) => string)
        | undefined;

      expect(formatter?.({ value: 9 })).toBe("Genre Nine");
      expect(filterGetter?.({ data: { genres: 7 } })).toBe("Genre Seven");
    });
  });

  describe("defaultColDef cellStyle", () => {
    it("highlights empty cells and leaves non-empty cells untouched", () => {
      const grid = useCmsProductionGrid({ isDark: ref(false), t: (key) => key, currentLang: ref('nl') });

      const cellStyle = grid.defaultColDef.cellStyle as
        | ((params: { value: unknown }) => Record<string, string> | null)
        | undefined;

      expect(cellStyle?.({ value: "   " })).toEqual({
        backgroundColor: "rgba(249, 115, 22, 0.05)",
        color: "rgba(120, 113, 108, 0.6)",
        fontStyle: "italic",
      });
      expect(cellStyle?.({ value: "filled" })).toBeNull();
    });
  });

  describe("getProductionRowStyle", () => {
    it("dims unfinalized rows and leaves finalized rows undefined", () => {
      const grid = useCmsProductionGrid({ isDark: ref(false), t: (key) => key });

      expect(grid.getProductionRowStyle({ data: { source: { finalized: false } } } as never)).toEqual({
        backgroundColor: "color-mix(in srgb, var(--surface-2) 34%, transparent)",
      });
      expect(grid.getProductionRowStyle({ data: { source: { finalized: true } } } as never)).toBeUndefined();
      expect(grid.getProductionRowStyle({ data: undefined } as never)).toBeUndefined();
    });
  });

  describe("CSV export specifics", () => {
    it("excludes the events action column and serializes tag arrays", () => {
      const exportDataAsCsv = vi.fn();
      const grid = useCmsProductionGrid({
        isDark: ref(false),
        t: (key) => key,
        currentLang: ref('nl'),
        getGenreOptions: () => [{ id: 7, label: "Genre A" }],
      });
      grid.gridApi.value = { exportDataAsCsv } as never;

      grid.exportGridCsv();

      const arg = exportDataAsCsv.mock.calls[0]?.[0];
      expect(arg.fileName).toBe("cms-productions.csv");
      expect(arg.columnKeys).not.toContain("eventsAction");

      const serializedTags = arg.processCellCallback({
        column: { getColId: () => "tags" },
        node: { data: { source: { tags: [1, 2] } } },
        value: "ignored",
      });
      expect(serializedTags).toBe("[1,2]");

      const serializedGenre = arg.processCellCallback({
        column: { getColId: () => "genres" },
        node: { data: { source: { tags: [] } } },
        value: 7,
      });
      expect(serializedGenre).toBe("Genre A");

      const serializedGenreFallback = arg.processCellCallback({
        column: { getColId: () => "genres" },
        node: null,
        value: 7,
      });
      expect(serializedGenreFallback).toBe("Genre A");

      const plainValue = arg.processCellCallback({
        column: { getColId: () => "title" },
        node: null,
        value: "My Title",
      });
      expect(plainValue).toBe("My Title");
    });
  });

  describe("onGridReady (production-specific override)", () => {
    it("does NOT fit columns when persisted state was restored", () => {
      const api = {
        getState: vi.fn(),
        setState: vi.fn(),
        getColumnState: vi.fn(() => []),
        setGridOption: vi.fn(),
        sizeColumnsToFit: vi.fn(),
      };
      localStorage.setItem("viernulvier-cms-grid-state-v2", JSON.stringify({ a: 1 }));
      const grid = useCmsProductionGrid({ isDark: ref(false), t: (key) => key, currentLang: ref('nl') });

      grid.onGridReady({ api } as never);

      expect(api.setState).toHaveBeenCalled();
      expect(api.sizeColumnsToFit).not.toHaveBeenCalled();
    });

    it("does fit columns when no persisted state exists", () => {
      localStorage.clear();
      const api = {
        getState: vi.fn(),
        setState: vi.fn(),
        getColumnState: vi.fn(() => []),
        setGridOption: vi.fn(),
        sizeColumnsToFit: vi.fn(),
      };
      const grid = useCmsProductionGrid({ isDark: ref(false), t: (key) => key, currentLang: ref('nl') });

      grid.onGridReady({ api } as never);

      expect(api.sizeColumnsToFit).toHaveBeenCalled();
    });
  });

  describe("edge cases and error handling", () => {
    it("handles undefined and null values in cellStyle", () => {
      const grid = useCmsProductionGrid({ isDark: ref(false), t: (key) => key, currentLang: ref('nl') });

      const cellStyle = grid.defaultColDef.cellStyle as
        | ((params: { value: unknown }) => Record<string, string> | null)
        | undefined;

      expect(cellStyle?.({ value: undefined })).toEqual({
        backgroundColor: "rgba(249, 115, 22, 0.05)",
        color: "rgba(120, 113, 108, 0.6)",
        fontStyle: "italic",
      });
      expect(cellStyle?.({ value: null })).toEqual({
        backgroundColor: "rgba(249, 115, 22, 0.05)",
        color: "rgba(120, 113, 108, 0.6)",
        fontStyle: "italic",
      });
    });

    it("renders ID column with links respecting language parameter", () => {
      const grid = useCmsProductionGrid({
        isDark: ref(false),
        t: (key) => key,
        currentLang: ref('fr'),
      });

      const idRenderer = grid.columnDefs.value[0]?.cellRenderer as
        | ((params: { value: number }) => string)
        | undefined;

      expect(idRenderer?.({ value: 123 })).toContain('/fr/productions/123');
    });

    it("handles missing currentLang in ID renderer", () => {
      const grid = useCmsProductionGrid({
        isDark: ref(false),
        t: (key) => key,
      });

      const idRenderer = grid.columnDefs.value[0]?.cellRenderer as
        | ((params: { value: number }) => string)
        | undefined;

      expect(idRenderer?.({ value: 456 })).toContain('/productions/456');
    });

    it("formats empty strings and whitespace in teaser and descriptions", () => {
      const grid = useCmsProductionGrid({
        isDark: ref(false),
        t: (key) => key,
        currentLang: ref('nl'),
      });

      const teaser = grid.columnDefs.value.find((d) => d.field === "teaser")?.valueFormatter as
        | ((params: { value: unknown }) => string)
        | undefined;

      expect(teaser?.({ value: "" })).toBe("");
      expect(teaser?.({ value: "   " })).toBe("   ");
      expect(teaser?.({ value: undefined })).toBe("");
      expect(teaser?.({ value: 123 })).toBe("123");
    });

    it("CSV processor handles all column types and edge cases", () => {
      const exportDataAsCsv = vi.fn();
      const grid = useCmsProductionGrid({
        isDark: ref(false),
        t: (key) => key,
        getGenreOptions: () => [{ id: 7, label: "Genre A" }],
        currentLang: ref('nl'),
      });
      grid.gridApi.value = { exportDataAsCsv } as never;

      grid.exportGridCsv();

      const arg = exportDataAsCsv.mock.calls[0]?.[0];

      // Tags with empty source
      expect(arg.processCellCallback({
        column: { getColId: () => "tags" },
        node: { data: { source: {} } },
        value: "ignored",
      })).toBe("[]");

      // Null node
      expect(arg.processCellCallback({
        column: { getColId: () => "unknown" },
        node: null,
        value: "test",
      })).toBe("test");

      // Empty string value
      expect(arg.processCellCallback({
        column: { getColId: () => "title" },
        node: { data: { source: {} } },
        value: "",
      })).toBe("");
    });

    it("handles imageMediaUrls with large counts", () => {
      const grid = useCmsProductionGrid({
        isDark: ref(false),
        t: (key: string, options?: { count?: number }) => {
          if (key === "cms.create.media.imageCountOne") return "1 image";
          if (key === "cms.create.media.imageCountOther") {
            return (options?.count ?? 2) + " images";
          }
          return key;
        },
        currentLang: ref('nl'),
      });

      const imageRenderer = grid.columnDefs.value.find((c) => c.field === "imageMedia")?.cellRenderer as
        | ((params: { data?: { imageMediaUrls?: string[] } }) => string)
        | undefined;

      const manyUrls = Array(50).fill("https://example.com/image.jpg");
      const result = imageRenderer?.({ data: { imageMediaUrls: manyUrls } });
      // Result is HTML, so we check if it's rendered as span element
      expect(result).toContain("50 images");
    });

    it("handles genre formatting with missing tag type references", () => {
      const grid = useCmsProductionGrid({
        isDark: ref(false),
        t: (key) => key,
        getGenreOptions: () => [{ id: 7, label: "Genre X" }],
      });

      const genresCol = grid.columnDefs.value.find((c) => c.field === "genres");
      const filterGetter = genresCol?.filterValueGetter as
        | ((params: { data?: { genres?: unknown } }) => string)
        | undefined;

      expect(filterGetter?.({ data: undefined })).toBe("-");
      expect(filterGetter?.({ data: { genres: undefined } })).toBe("-");
    });

    it("truncateValue handles exact boundary conditions", () => {
      // Test at maxLength boundary
      const exactLength = "x".repeat(48);
      const result = (grid: any) => {
        const teaser = grid.columnDefs.value.find((d: any) => d.field === "teaser")?.valueFormatter as
          | ((params: { value: unknown }) => string)
          | undefined;
        return teaser?.({ value: exactLength });
      };

      const grid = useCmsProductionGrid({
        isDark: ref(false),
        t: (key) => key,
        currentLang: ref('nl'),
      });

      expect(result(grid)).toBe(exactLength);
    });
  });
});
