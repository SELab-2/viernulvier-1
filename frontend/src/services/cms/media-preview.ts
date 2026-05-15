import type { Crop } from "@viernulvier/shared";

const PREFERRED_CROP_TYPES = [
  "cms_wide",
  "fe3_home_featuredwide",
  "fe3_header",
  "nb_header",
  "cms",
  "fe3_boxed",
  "cms_thumbnail",
] as const;

function normalizeCropType(value: string): string {
  return value.trim().toLowerCase().replaceAll("-", "_");
}

function toAbsoluteMediaUrl(url: string, origin: string): string {
  return url.startsWith("http") ? url : `${origin}${url}`;
}

export function resolvePreferredCropUrl(
  crops: Crop[] | null | undefined,
  origin: string,
): string | null {
  if (!crops || crops.length === 0) {
    return null;
  }

  for (const cropType of PREFERRED_CROP_TYPES) {
    const match = crops.find(
      (crop) => normalizeCropType(crop.type) === cropType && Boolean(crop.url),
    );
    if (match?.url) {
      return toAbsoluteMediaUrl(match.url, origin);
    }
  }

  const firstWithUrl = crops.find((crop) => Boolean(crop.url));
  return firstWithUrl?.url ? toAbsoluteMediaUrl(firstWithUrl.url, origin) : null;
}
