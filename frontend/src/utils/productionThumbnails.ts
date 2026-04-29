import type { ImageWithCrops } from "@/services/media";
import type { Crop } from "@viernulvier/shared";

/** List/card thumbnails */
export const PRODUCTION_LIST_THUMB_CROP_TYPE = "FE3_header" as const;

/** Detail hero banner (first gallery image) */
export const PRODUCTION_DETAIL_BANNER_CROP_TYPE = "FE3_home_featuredWide" as const;

/** Carousel / gallery slides */
export const PRODUCTION_GALLERY_SLIDE_CROP_TYPE = "FE3_boxed" as const;

function cropUrlForType(crops: Crop[], type: string): string | null {
  const crop = crops.find((c) => c.type === type);
  const url = crop?.url?.trim();
  return url ? url : null;
}

/**
 * Picks the carousel crop URL for one gallery image (`FE3_boxed` only).
 */
export function pickHighQualityImageCropUrl(image: ImageWithCrops): string | null {
  return cropUrlForType(image.crops ?? [], PRODUCTION_GALLERY_SLIDE_CROP_TYPE);
}

/**
 * Picks the list/card thumbnail URL: first image that has `FE3_header`.
 */
export function pickProductionListThumbnailUrl(
  images: ImageWithCrops[],
): string | null {
  for (const image of images) {
    const url = cropUrlForType(image.crops ?? [], PRODUCTION_LIST_THUMB_CROP_TYPE);
    if (url) return url;
  }
  return null;
}

/**
 * Hero banner URL from the first gallery image (`FE3_home_featuredWide` only).
 */
export function pickProductionDetailBannerUrl(images: ImageWithCrops[]): string | null {
  const first = images[0];
  if (!first) return null;
  return cropUrlForType(first.crops ?? [], PRODUCTION_DETAIL_BANNER_CROP_TYPE);
}
