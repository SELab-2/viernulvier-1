import type { ImageWithCrops } from "@/services/media";

/**
 * Picks a single crop URL for a compact list preview: first image with a usable
 * crop, preferring the `banner` type (Viernulvier’s wide list-style crop), then
 * thumbnail-like names, otherwise the first crop.
 */
export function pickProductionListThumbnailUrl(
  images: ImageWithCrops[],
): string | null {
  for (const image of images) {
    const crops = image.crops ?? [];
    if (crops.length === 0) continue;
    const banner = crops.find((c) => c.type === "banner");
    const thumbLike = crops.find((c) =>
      /thumb|small|mini|preview|klein/i.test(c.type),
    );
    const chosen = banner ?? thumbLike ?? crops[0];
    if (chosen?.url) return chosen.url;
  }
  return null;
}
