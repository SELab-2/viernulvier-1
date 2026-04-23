import type { ImageWithCrops } from "@/services/media";

/**
 * Picks a single crop URL for a compact list preview: first image, then a
 * thumbnail-like crop if the API names one that way, otherwise the first crop.
 */
export function pickProductionListThumbnailUrl(
  images: ImageWithCrops[],
): string | null {
  for (const image of images) {
    const crops = image.crops ?? [];
    if (crops.length === 0) continue;
    const byName = crops.find((c) =>
      /thumb|small|mini|preview|klein/i.test(c.type),
    );
    const chosen = byName ?? crops[0];
    if (chosen?.url) return chosen.url;
  }
  return null;
}
