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
  /** Target height in pixels. For 'native' fit, this is ignored. */
  height: number;
  /** How to fit the image: 'cover' (crop to exact dimensions), 'contain' (letterbox), or 'native' (scale to width preserving aspect ratio). */
  fit: "cover" | "contain" | "native";
}

/**
 * Predetermined crop types for CMS media.
 * These are automatically generated when an image is uploaded.
 */
export const CMS_CROP_DEFINITIONS: CropDefinition[] = [
  {
    type: "FE3_header",
    width: 1920,
    height: 900,
    fit: "cover",
  },
  {
    type: "FE3_home_featuredWide",
    width: 1920,
    height: 600,
    fit: "cover",
  },
  {
    type: "FE3_boxed",
    width: 1920,
    height: 0, // calculated from image aspect ratio
    fit: "native",
  },
  {
    type: "nb_header",
    width: 500,
    height: 0, // calculated from image aspect ratio
    fit: "native",
  },
  {
    type: "cms",
    width: 100,
    height: 0, // calculated from image aspect ratio
    fit: "native",
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

  // Calculate source region and destination dimensions based on fit mode
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  let dw = crop.width;
  let dh = crop.height;

  if (crop.fit === "cover") {
    // Calculate scaling to cover the target aspect ratio
    const targetAspect = crop.width / crop.height;
    const imageAspect = img.naturalWidth / img.naturalHeight;

    if (imageAspect > targetAspect) {
      // Image is wider, crop sides
      sw = img.naturalHeight * targetAspect;
      sx = (img.naturalWidth - sw) / 2;
    } else {
      // Image is taller, crop top/bottom
      sh = img.naturalWidth / targetAspect;
      sy = (img.naturalHeight - sh) / 2;
    }
  } else if (crop.fit === "native") {
    // Scale to width, preserving aspect ratio
    const scale = crop.width / img.naturalWidth;
    dh = Math.round(img.naturalHeight * scale);
    canvas.height = dh;
  } else {
    // contain mode - letterbox with white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, crop.width, crop.height);
  }

  // Draw the image
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);

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
