import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useCmsBlogPostGrid } from "@/composables/useCmsBlogPostGrid";
import type { Language } from "@/utils/language-utils";

describe("useCmsBlogPostGrid", () => {
  it("declares the blogpost column definitions", () => {
    const { columnDefs } = useCmsBlogPostGrid({ isDark: ref(false), t: (key) => key, currentLang: ref<Language>("en") });

    expect(columnDefs.value).toHaveLength(5);

    const id = columnDefs.value.find((c) => c.field === "id");
    const title = columnDefs.value.find((c) => c.field === "title");
    const content = columnDefs.value.find((c) => c.field === "content");
    const publishedAt = columnDefs.value.find((c) => c.field === "publishedAt");
    const productions = columnDefs.value.find((c) => c.field === "productions");

    expect(id?.cellRenderer).toBeDefined();
    expect(title?.flex).toBe(1);
    expect(content?.flex).toBe(2);
    expect(publishedAt?.minWidth).toBe(180);
    expect(productions?.minWidth).toBe(200);
  });

  it("builds translated column options", () => {
    const { gridColumnOptions } = useCmsBlogPostGrid({ isDark: ref(false), t: (key) => key, currentLang: ref<Language>("en") });

    expect(gridColumnOptions.value).toEqual([
      { colId: "id", label: "cms.columns.id" },
      { colId: "title", label: "cms.columns.title" },
      { colId: "content", label: "cms.columns.blogpost.content" },
      { colId: "publishedAt", label: "cms.columns.blogpost.publishedAt" },
      { colId: "productions", label: "cms.columns.blogpost.productions" },
    ]);
  });

  it("exposes a pinned selection column definition", () => {
    const { selectionColumnDef } = useCmsBlogPostGrid({ isDark: ref(false), t: (key) => key, currentLang: ref<Language>("en") });

    expect(selectionColumnDef.width).toBe(48);
    expect(selectionColumnDef.pinned).toBe("left");
    expect(selectionColumnDef.resizable).toBe(false);
  });

  it("provides a non-editable defaultColDef with floating filter", () => {
    const { defaultColDef } = useCmsBlogPostGrid({ isDark: ref(false), t: (key) => key, currentLang: ref<Language>("en") });

    expect(defaultColDef.editable).toBe(false);
    expect(defaultColDef.sortable).toBe(true);
    expect(defaultColDef.floatingFilter).toBe(true);
  });

  it("renders the id cell as a link to the blog post", () => {
    const { columnDefs } = useCmsBlogPostGrid({ isDark: ref(false), t: (key) => key, currentLang: ref<Language>("en") });

    const id = columnDefs.value.find((c) => c.field === "id");
    const renderer = id?.cellRenderer as (params: { value: number }) => string;

    const html = renderer({ value: 42 });

    expect(html).toContain('href="/en/blog/post/42"');
  });
});