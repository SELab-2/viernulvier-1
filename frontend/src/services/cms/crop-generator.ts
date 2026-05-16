/**
 * Crop generation utilities for CMS media uploads.
 * Generates predetermined crops from images using canvas.
 */

/** Definition of a crop to generate from an image. */
export interface CropDefinition {
  /** Type identifier for the crop (stored in database). */
  type: string;
  /** Target width in pixels. */
  width: number;
  /** Target height in pixels. */
  height: number;
  /** How to fit the image: 'cover' (crop) or 'contain' (letterbox). */
  fit: "cover" | "contain";
}

/**
 * Predetermined crop types for CMS media.
 * These are automatically generated when an image is uploaded.
 */
export const CMS_CROP_DEFINITIONS: CropDefinition[] = [
  {
    type: "cms",
    width: 800,
    height: 600,
    fit: "cover",
  },
  {
    type: "cms_thumbnail",
    width: 300,
    height: 300,
    fit: "cover",
  },
  {
    type: "cms_wide",
    width: 1600,
    height: 900,
    fit: "cover",
  },
];

/**
 * Loads an image from a data URL or file data.
 */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

/**
 * Generates a crop from an image using canvas.
 *
 * @param imageData - Image data URL
 * @param crop - Crop definition
 * @returns Promise resolving to crop blob data with filename
 */
export async function generateCrop(
  imageData: string,
  crop: CropDefinition,
): Promise<{
  blob: Blob;
  type: string;
  filename: string;
}> {
  const img = await loadImage(imageData);

  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Calculate source region based on fit mode
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;

  if (crop.fit === "cover") {
    // Calculate scaling to cover the target aspect ratio
    const targetAspect = crop.width / crop.height;
    const imageAspect = img.naturalWidth / img.naturalHeight;

    if (imageAspect > targetAspect) {
      // Image is wider, crop sides
      sw = (img.naturalHeight * targetAspect);
      sx = (img.naturalWidth - sw) / 2;
    } else {
      // Image is taller, crop top/bottom
      sh = (img.naturalWidth / targetAspect);
      sy = (img.naturalHeight - sh) / 2;
    }
  }
  // For 'contain' mode, we'll draw with letterboxing (white background)
  else {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, crop.width, crop.height);
  }

  // Draw the image
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, crop.width, crop.height);

  // Convert canvas to blob
  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create blob"));
          return;
        }
        resolve({
          blob,
          type: crop.type,
          filename: `crop-${crop.type}-${Date.now()}.jpg`,
        });
      },
      "image/jpeg",
      0.9,
    );
  });
}

/**
 * Generates all predetermined crops from an image.
 *
 * @param imageData - Image data URL
 * @returns Promise resolving to array of crop data
 */
export async function generateAllCrops(
  imageData: string,
): Promise<Array<{
  blob: Blob;
  type: string;
  filename: string;
}>> {
  return await Promise.all(CMS_CROP_DEFINITIONS.map((crop) => generateCrop(imageData, crop)));
}
