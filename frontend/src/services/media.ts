/**
 * @file Media API — public image/crop reads for the visitor site.
 *
 * Mutating endpoints require an admin session; not exposed here.
 */

import type { Crop, Image } from "@viernulvier/shared";
import { apiFetch } from "./api";

export type ImageWithCrops = Image & { crops: Crop[] };

/**
 * All images (with nested crops) for a production.
 *
 * @throws {ApiError} on transport / server error (4xx/5xx).
 */
export async function getImagesForProduction(
  productionId: number,
): Promise<ImageWithCrops[]> {
  return await apiFetch<ImageWithCrops[]>(
    `/production/${productionId}/image`,
  );
}
