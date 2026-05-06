import { describe, expect, it, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { useCmsProductionGrid } from "@/composables/useCmsProductionGrid";

describe("useCmsProductionGrid", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("column definitions", () => {
    it("declares ten production columns including the events action", () => {
      const grid = useCmsProductionGrid({ isDark: ref(false), t: (key) => key });

      expect(grid.columnDefs.value).toHaveLength(10);
      expect(grid.gridColumnOptions.value).toHaveLength(10);

      const eventsValueGetter = grid.columnDefs.value[0]?.valueGetter as
        | ((params: unknown) => string)
        | undefined;
      expect(eventsValueGetter?.({})).toBe("View");
    });

    it("truncates long teaser and description values via valueFormatter", () => {
      const defs = useCmsProductionGrid({ isDark: ref(false), t: (key) => key }).columnDefs.value;

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
      const grid = useCmsProductionGrid({ isDark: ref(false), t: (key) => key });

      const mediaRenderer = grid.columnDefs.value.find((c) => c.field === "media")?.cellRenderer as
        | ((params: { value: unknown }) => string)
        | undefined;

      expect(mediaRenderer?.({ value: "https://example.com/cover.jpg" } as never)).toContain("cms-media-text");
      expect(
        mediaRenderer?.({ value: `https://example.com/a & b<'">.jpg` } as never),
      ).toContain("https://example.com/a &amp; b&lt;&#39;&quot;&gt;.jpg");
      expect(mediaRenderer?.({ value: "" } as never)).toBe("");
      expect(mediaRenderer?.({ value: "   " } as never)).toBe("");
      expect(mediaRenderer?.({ value: null } as never)).toBe("");
    });

    it("uses primary tag labels as genre editor values with empty fallback", () => {
      const withLabels = useCmsProductionGrid({
        isDark: ref(false),
        t: (key) => key,
        getPrimaryTagLabels: () => ["Genre A", "Genre B"],
      });
      const withParams = withLabels.columnDefs.value.find((c) => c.field === "genres")?.cellEditorParams as
        | (() => { values: string[] })
        | undefined;
      expect(withParams?.().values).toEqual(["Genre A", "Genre B"]);

      const withoutLabels = useCmsProductionGrid({ isDark: ref(false), t: (key) => key });
      const withoutParams = withoutLabels.columnDefs.value.find((c) => c.field === "genres")?.cellEditorParams as
        | (() => { values: string[] })
        | undefined;
      expect(withoutParams?.().values).toEqual([]);
    });
  });

  describe("defaultColDef cellStyle", () => {
    it("highlights empty cells and leaves non-empty cells untouched", () => {
      const grid = useCmsProductionGrid({ isDark: ref(false), t: (key) => key });

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
      const grid = useCmsProductionGrid({ isDark: ref(false), t: (key) => key });
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
      const grid = useCmsProductionGrid({ isDark: ref(false), t: (key) => key });

      grid.onGridReady({ api } as never);

      expect(api.setState).toHaveBeenCalled();
      expect(api.sizeColumnsToFit).not.toHaveBeenCalled();
    });
  });
});
