/**
 * Which crop `name` values (from Viernulvier JSON-LD) the scraper downloads per image.
 * Names must match upstream strings exactly (same as stored `crop.type` locally).
 *
 * Edit this list when you want different resolutions/shapes — avoid scraping all ~23 variants.
 */

/** Crop names to keep when scraping media (exact match). */
export const SCRAPER_CROP_NAMES = new Set<string>([
  "FE3_header",
  "FE3_home_featuredWide",
  "FE3_boxed",
  "nb_header",
  "cms",
]);

/** Drops crops whose `name` is not in `allowed`. */
export function filterCropsByAllowList<T extends { name: string }>(
  crops: T[],
  allowed: Set<string>,
): T[] {
  return crops.filter((c) => allowed.has(c.name));
}