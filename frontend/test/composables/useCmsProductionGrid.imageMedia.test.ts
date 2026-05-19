import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useCmsProductionGrid } from "@/composables/useCmsProductionGrid";

describe("useCmsProductionGrid imageMedia renderer", () => {
  it("renders singular localized image count", () => {
    const t = (key: string, params?: Record<string, unknown>) => {
      if (key === "cms.create.media.imageCountOne") {
        return "1 afbeelding";
      }
      if (key === "cms.create.media.imageCountOther") {
        return `${params?.count as number} afbeeldingen`;
      }
      return key;
    };

    const grid = useCmsProductionGrid({ isDark: ref(false), t });
    const imageMediaRenderer = grid.columnDefs.value.find((c) => c.field === "imageMedia")?.cellRenderer as
      | ((params: { data?: { imageMediaUrls?: string[] } }) => string)
      | undefined;

    const html = imageMediaRenderer?.({
      data: { imageMediaUrls: ["https://cdn.example.test/a.jpg"] },
    } as never);

    expect(html).toContain("1 afbeelding");
  });

  it("renders plural localized image count and hides empty cells", () => {
    const t = (key: string, params?: Record<string, unknown>) => {
      if (key === "cms.create.media.imageCountOne") {
        return "1 image";
      }
      if (key === "cms.create.media.imageCountOther") {
        return `${params?.count as number} images`;
      }
      return key;
    };

    const grid = useCmsProductionGrid({ isDark: ref(false), t });
    const imageMediaRenderer = grid.columnDefs.value.find((c) => c.field === "imageMedia")?.cellRenderer as
      | ((params: { data?: { imageMediaUrls?: string[] } }) => string)
      | undefined;

    const pluralHtml = imageMediaRenderer?.({
      data: { imageMediaUrls: ["1", "2", "3"] },
    } as never);
    const emptyHtml = imageMediaRenderer?.({
      data: { imageMediaUrls: [] },
    } as never);

    expect(pluralHtml).toContain("3 images");
    expect(emptyHtml).toBe("");
  });
});
