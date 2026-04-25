import type { ImageWithCrops } from "@/services/media";
import type { Crop } from "@viernulvier/shared";

/**
 * High-res / wide crop names (Viernulvier archive). Used for the detail hero, gallery, etc.
 * Order is tried per image until a match exists.
 */
export const HIGH_QUALITY_CROP_TYPE_PRIORITY: readonly string[] = [
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

function pickUrlFromCrops(crops: Crop[]): string | null {
  if (crops.length === 0) return null;
  for (const type of HIGH_QUALITY_CROP_TYPE_PRIORITY) {
    const found = crops.find((c) => c.type === type);
    if (found?.url) return found.url;
  }
  return crops[0]!.url;
}

/**
 * Picks the best available crop URL for one gallery image (same quality preference as the hero).
 */
export function pickHighQualityImageCropUrl(image: ImageWithCrops): string | null {
  return pickUrlFromCrops(image.crops ?? []);
}

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
 * Picks a URL for the production detail hero from the first gallery image.
 */
export function pickProductionDetailBannerUrl(images: ImageWithCrops[]): string | null {
  const first = images[0];
  if (!first) return null;
  return pickUrlFromCrops(first.crops ?? []);
}
