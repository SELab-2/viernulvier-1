/**
 * Image and crop management services.
 * 
 * Handles fetching and managing images and their crops for productions.
 */

import type { Image, Crop } from "@viernulvier/shared";
import { apiFetch } from "./api";

/**
 * Fetches all images (with crops) for a specific production.
 * 
 * @param productionId - The production ID
 * @returns Array of images with their associated crops
 */
export async function getImagesByProduction(
  productionId: number,
): Promise<(Image & { crops?: Crop[] })[]> {
  return await apiFetch<(Image & { crops?: Crop[] })[]>(
    `/api/v1/production/${productionId}/image`,
  );
}

/**
 * Fetches a single image by ID (with its crops).
 * 
 * @param imageId - The image ID
 * @returns Image with crops
 */
export async function getImage(imageId: number): Promise<Image & { crops?: Crop[] }> {
  return await apiFetch<Image & { crops?: Crop[] }>(`/api/v1/image/${imageId}`);
}

/**
 * Deletes an image and its associated crops.
 * 
 * @param imageId - The image ID to delete
 */
export async function deleteImage(imageId: number): Promise<void> {
  return await apiFetch<void>(`/api/v1/image/${imageId}`, {
    method: "DELETE",
  });
}
