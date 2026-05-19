import { describe, it, expect } from "vitest";
import type { Crop } from "@viernulvier/shared";
import { resolvePreferredCropUrl, isImagePreviewUrl, isVideoPreviewUrl } from "@/services/cms/media-preview";

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

describe("media-preview helper", () => {
  it("returns null for empty crops", () => {
    expect(resolvePreferredCropUrl(null, origin)).toBeNull();
    expect(resolvePreferredCropUrl([], origin)).toBeNull();
  });

  it("prefers cms_wide and normalizes types", () => {
    const result = resolvePreferredCropUrl([
      crop("cms", "/media/crops/cms.jpg"),
      crop("CMS-WIDE", "/media/crops/wide.jpg"),
    ], origin);
    expect(result).toBe(`${origin}/media/crops/wide.jpg`);
  });

  it("falls back to first crop with url when preferred not present", () => {
    const result = resolvePreferredCropUrl([
      crop("a", null as any),
      crop("b", "/first.jpg"),
    ], origin);
    expect(result).toBe(`${origin}/first.jpg`);
  });

  it("returns null when no crops have urls", () => {
    const result = resolvePreferredCropUrl([
      crop("a", null as any),
      crop("b", ""),
    ], origin);
    expect(result).toBeNull();
  });

  it("keeps absolute URLs unchanged", () => {
    const result = resolvePreferredCropUrl([
      crop("cms_wide", "https://cdn.example.test/media/crops/wide.jpg"),
    ], origin);
    expect(result).toBe("https://cdn.example.test/media/crops/wide.jpg");
  });

  it("detects image urls", () => {
    expect(isImagePreviewUrl("data:image/png;base64,abc")).toBe(true);
    expect(isImagePreviewUrl("https://example.com/photo.JPG")).toBe(true);
    expect(isImagePreviewUrl("/media/crops/thumb.jpg")).toBe(true);
    expect(isImagePreviewUrl("not-an-image")).toBe(false);
  });

  it("detects video urls", () => {
    expect(isVideoPreviewUrl("https://youtube.com/watch?v=x")).toBe(true);
    expect(isVideoPreviewUrl("https://vimeo.com/123")).toBe(true);
    expect(isVideoPreviewUrl("https://example.com/video.webm")).toBe(true);
    expect(isVideoPreviewUrl("just-text")).toBe(false);
  });
});
// duplicated content removed; consolidated tests are above
