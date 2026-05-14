/**
 * Media upload service for CMS production images.
 * Handles uploading images with auto-generated crops.
 */

import { apiFetch } from "@/services/api";
import { generateAllCrops } from "./crop-generator";
import type { Image, Crop } from "@viernulvier/shared";

/**
 * Uploads an image to a production with auto-generated crops.
 *
 * @param productionId - Production ID to attach image to
 * @param imageData - Data URL of the image
 * @param resolution - Optional resolution string (e.g., "1920x1080")
 * @returns Promise resolving to the created image with its crops
 */
export async function uploadImageWithCrops(
  productionId: number,
  imageData: string,
  resolution?: string,
): Promise<Image & { crops: Crop[] }> {
  // Generate crops from the image
  const crops = await generateAllCrops(imageData);

  // Convert data URL to blob for the image
  const imageBlob = await (await fetch(imageData)).blob();

  // Create FormData for multipart upload
  const formData = new FormData();

  // Add data field with image metadata and crop mappings
  formData.append(
    "data",
    JSON.stringify({
      res: resolution ?? null,
      crops: crops.map((crop) => ({
        filename: crop.filename,
        type: crop.type,
      })),
    }),
  );

  // Add image file
  formData.append("image", imageBlob, "image.jpg");

  // Add crop files
  crops.forEach((crop) => {
    formData.append(crop.filename, crop.blob, crop.filename);
  });

  // Upload to backend
  const response = await apiFetch(
    `/api/v1/production/${productionId}/image`,
    {
      method: "POST",
      body: formData,
    },
  );

  return response;
}

/**
 * Uploads crops to an existing image.
 *
 * @param imageId - Image ID to attach crops to
 * @param crops - Crop data (blob, type, filename)
 * @returns Promise resolving to array of created crops
 */
export async function uploadCrops(
  imageId: number,
  crops: Array<{
    blob: Blob;
    type: string;
    filename: string;
  }>,
): Promise<Crop[]> {
  const formData = new FormData();

  formData.append(
    "data",
    JSON.stringify({
      crops: crops.map((crop) => ({
        filename: crop.filename,
        type: crop.type,
      })),
    }),
  );

  crops.forEach((crop) => {
    formData.append(crop.filename, crop.blob, crop.filename);
  });

  const response = await apiFetch(
    `/api/v1/image/${imageId}/crop`,
    {
      method: "POST",
      body: formData,
    },
  );

  return response;
}
