/**
 * @file Media API — public image/crop reads for the visitor site.
 *
 * Mutating endpoints require an admin session; not exposed here.
 */

import type { Crop, Image } from "@viernulvier/shared";
import { apiFetch, ApiError } from "./api";

export type ImageWithCrops = Image & { crops: Crop[] };

export type ProductionImagesBatchResponse = {
  byProductionId: Record<string, ImageWithCrops[]>;
};

const MAX_IDS_PER_PRODUCTION_IMAGE_BATCH = 50;

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
  return await getImagesForProduction(productionId).catch((err: unknown) =>
    handleProductionImagesFetchError(productionId, err),
  );
}

function handleProductionImagesBatchFetchError(
  productionIds: readonly number[],
  err: unknown,
): void {
  const slug =
    productionIds.length <= 5
      ? `[production ids: ${productionIds.join(",")}]`
      : `[production ids: (${productionIds.length} ids)]`;
  if (err instanceof ApiError) {
    console.warn(
      `${slug} GET /production/images failed: HTTP ${err.status} — ${err.message}`,
    );
    return;
  }
  console.warn(`${slug} GET /production/images failed (non-ApiError)`, err);
}

/**
 * Batch-fetch images (with crops) for many productions in one HTTP round-trip.
 * Successful responses map each id to an array (possibly empty). Request failures
 * (including 404 on this route, which signals routing/deploy mismatch) log with 
 * {@link console.warn} and degrade to empty lists per id.
 */
export async function getImagesForProductionsOrEmpty(
  productionIds: number[],
): Promise<Map<number, ImageWithCrops[]>> {
  const unique: number[] = [];
  const seen = new Set<number>();
  for (const id of productionIds) {
    if (typeof id !== "number" || !Number.isFinite(id) || id < 1) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
    if (unique.length >= MAX_IDS_PER_PRODUCTION_IMAGE_BATCH) break;
  }

  function emptyListsMap(): Map<number, ImageWithCrops[]> {
    return new Map(unique.map((id) => [id, []]));
  }

  if (unique.length === 0) {
    return new Map();
  }

  try {
    const params = new URLSearchParams({ ids: unique.join(",") });
    const body = await apiFetch<ProductionImagesBatchResponse>(
      `/production/images?${params.toString()}`,
    );
    const out = new Map<number, ImageWithCrops[]>();
    for (const id of unique) {
      const list = body.byProductionId[String(id)];
      out.set(id, Array.isArray(list) ? list : []);
    }
    return out;
  } catch (err: unknown) {
    handleProductionImagesBatchFetchError(unique, err);
    return emptyListsMap();
  }
}
