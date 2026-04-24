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

/**
 * For the detail hero we want the full-resolution master, `hd_ready` is the usual archive export
 * for that. Wider / header types follow; `nb_header` and `banner` are last resort before “any” 
 * crop on the first image.
 */
const PRODUCTION_DETAIL_BANNER_TYPE_PRIORITY: readonly string[] = [
  "hd_ready",
  "nbv4_header",
  "FE3_2by1",
  "FE3_header",
  "FE3_boxed",
  "FE3_home_featuredWide",
  "FE3_sponsor",
  "banner",
  "nb_header",
];

/**
 * Picks a URL for the production detail hero from the first gallery image
 */
export function pickProductionDetailBannerUrl(images: ImageWithCrops[]): string | null {
  const first = images[0];
  if (!first) return null;
  const crops = first.crops ?? [];
  if (crops.length === 0) return null;

  for (const type of PRODUCTION_DETAIL_BANNER_TYPE_PRIORITY) {
    const found = crops.find((c) => c.type === type);
    if (found?.url) return found.url;
  }
  return crops[0]!.url;
}
