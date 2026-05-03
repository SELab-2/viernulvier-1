/**
 * @file Media API — public image/crop reads for the visitor site.
 *
 * Mutating endpoints require an admin session; not exposed here.
 */

import type { Crop, Image } from "@viernulvier/shared";
import { apiFetch, ApiError } from "./api";

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

function handleProductionImagesFetchError(
  productionId: number,
  err: unknown,
): ImageWithCrops[] {
  if (err instanceof ApiError && err.status === 404) {
    return [];
  }
  if (err instanceof ApiError) {
    console.warn(
      `[production ${productionId}] GET /production/${productionId}/image failed: HTTP ${err.status} — ${err.message}`,
    );
    return [];
  }
  console.warn(
    `[production ${productionId}] GET /production/${productionId}/image failed (non-ApiError)`,
    err,
  );
  return [];
}

/**
 * Same data as {@link getImagesForProduction}, but returns `[]` on failure so
 * UIs can degrade (empty gallery / missing thumbnail). HTTP 404 is treated as
 * an empty set without logging; other errors use `console.warn`.
 */
export async function getImagesForProductionOrEmpty(
  productionId: number,
): Promise<ImageWithCrops[]> {
  return getImagesForProduction(productionId).catch((err: unknown) =>
    handleProductionImagesFetchError(productionId, err),
  );
}
