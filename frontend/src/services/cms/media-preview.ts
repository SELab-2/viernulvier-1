import type { Crop } from "@viernulvier/shared";

export interface CmsMediaPreview {
  url: string;
  kind: "image" | "video" | "iframe" | "gallery";
  label: string;
  imageId?: number;
  productionId?: number;
  mediaField?: "video_1" | "video_2";
  images?: Array<{ id: number; url: string }>;
  currentImageIndex?: number;
}

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

export function isImagePreviewUrl(url: string): boolean {
  const value = url.trim().toLowerCase();
  return /^(data:image\/|https?:\/\/.*\.(?:png|jpe?g|gif|webp|svg)(?:\?.*)?$|https?:\/\/.*\/media\/crops\/|\/media\/crops\/|media\/crops\/)/.test(value);
}

export function isVideoPreviewUrl(url: string): boolean {
  const value = url.trim().toLowerCase();
  if (value.includes("youtube.com") || value.includes("youtu.be") || value.includes("vimeo.com")) {
    return true;
  }
  return /^(data:video\/|https?:\/\/.*\.(?:webm|ogg|mov)(?:\?.*)?$)/.test(value);
}
