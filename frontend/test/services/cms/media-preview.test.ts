import { describe, expect, it } from "vitest";
import type { Crop } from "@viernulvier/shared";
import { resolvePreferredCropUrl } from "@/services/cms/media-preview";

const origin = "https://cms.example.test";

function crop(type: string, url: string): Crop {
  return {
    id: 1,
    image: 1,
    type,
    url,
    old_id: null,
  };
}

describe("resolvePreferredCropUrl", () => {
  it("prefers cms_wide over cms", () => {
    const result = resolvePreferredCropUrl(
      [
        crop("cms", "/media/crops/cms.jpg"),
        crop("cms_wide", "/media/crops/wide.jpg"),
      ],
      origin,
    );

    expect(result).toBe(`${origin}/media/crops/wide.jpg`);
  });

  it("prefers FE3_home_featuredWide for legacy scraped images", () => {
    const result = resolvePreferredCropUrl(
      [
        crop("cms", "/media/crops/cms.jpg"),
        crop("FE3_home_featuredWide", "/media/crops/legacy-wide.jpg"),
      ],
      origin,
    );

    expect(result).toBe(`${origin}/media/crops/legacy-wide.jpg`);
  });

  it("normalizes crop type casing and separators", () => {
    const result = resolvePreferredCropUrl(
      [
        crop("cms", "/media/crops/cms.jpg"),
        crop("CMS-WIDE", "/media/crops/wide.jpg"),
      ],
      origin,
    );

    expect(result).toBe(`${origin}/media/crops/wide.jpg`);
  });

  it("falls back to first available crop when no preferred type is present", () => {
    const result = resolvePreferredCropUrl(
      [
        crop("other", "/media/crops/other.jpg"),
        crop("another", "/media/crops/another.jpg"),
      ],
      origin,
    );

    expect(result).toBe(`${origin}/media/crops/other.jpg`);
  });

  it("returns null when crops are missing", () => {
    expect(resolvePreferredCropUrl([], origin)).toBeNull();
    expect(resolvePreferredCropUrl(null, origin)).toBeNull();
    expect(resolvePreferredCropUrl(undefined, origin)).toBeNull();
  });

  it("keeps absolute URLs unchanged", () => {
    const result = resolvePreferredCropUrl(
      [crop("cms_wide", "https://cdn.example.test/media/crops/wide.jpg")],
      origin,
    );

    expect(result).toBe("https://cdn.example.test/media/crops/wide.jpg");
  });
});
