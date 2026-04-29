import { localApiUrl } from "./local-api.js";
import type { ScrapeRunStats } from "./scrape-stats.js";
import { viernulvierApiUrl } from "./viernulvier-api.js";
import { createCropsForImage } from "./crop.js";
import type { Crop, Image } from "@viernulvier/shared/types/index.js";

/**
 * Raw media gallery from Viernulvier JSON-LD.
 */
export interface MediaGalleryJSON {
  "@id": string;
  "@type": string;
  name?: string;
  items?: MediaItemJSON[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Raw media item from Viernulvier JSON-LD (only fields we read).
 */
export interface MediaItemJSON {
  "@id": string;
  "@type": string;
  type: "foto" | "video";
  original_filename?: string;
  position?: number;
  width?: number;
  height?: number;
  format?: string;
  title?: Record<string, string>;
  description?: Record<string, string>;
  credits?: Record<string, string>;
  created_at?: string;
  updated_at?: string;
  crops?: Array<{
    "@id": string;
    "@type": string;
    name: string;
    url?: string;
    created_at?: string;
    updated_at?: string;
  }>;
}

/**
 * Create payload for local image endpoint.
 */
export interface CreateImageBody {
  old_id: number;
  res?: string | null;
}

/**
 * Fetches local image ID by old_id to check if already imported.
 */
async function fetchLocalImageIdByOldId(
  oldId: number,
  loginToken: string,
): Promise<number | null> {
  const url = new URL(localApiUrl("/api/v1/image"));
  url.searchParams.set("oldId", String(oldId));

  const response = await fetch(url.toString(), {
    headers: {
      "Authorization": `Bearer ${loginToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch image from local API: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as Array<Image & { crops: Crop[] }>;
  if (data.length === 0) return null;
  if (data.length > 1) {
    throw new Error(`Multiple images found with old_id ${oldId}`);
  }
  return data[0]!.id;
}

/**
 * Helper to extract ID from IRI path.
 */
function extractIdFromIri(iri: string): number | null {
  const id = parseInt(iri.split("/").pop() || "", 10);
  return Number.isFinite(id) ? id : null;
}

/**
 * Creates an image and its crops for a production from a media item.
 */
async function createImageWithCrops(
  mediaItem: MediaItemJSON,
  productionId: number,
  loginToken: string,
  stats?: ScrapeRunStats,
): Promise<number | null> {
  const oldId = extractIdFromIri(mediaItem["@id"]);
  if (!oldId) {
    console.warn(`Could not extract ID from media item ${mediaItem["@id"]}`);
    if (stats) stats.media_skipped = (stats.media_skipped ?? 0) + 1;
    return null;
  }

  // Check if image already exists
  const existing = await fetchLocalImageIdByOldId(oldId, loginToken);
  if (existing !== null) {
    console.log(`Image old_id=${oldId} already exists (id=${existing}), skipping`);
    if (stats) stats.media_existing = (stats.media_existing ?? 0) + 1;
    return existing;
  }

  // Create image
  const imagePayload: CreateImageBody = {
    old_id: oldId,
    res: mediaItem.width && mediaItem.height 
      ? `${mediaItem.width}x${mediaItem.height}` 
      : null,
  };

  const imageResponse = await fetch(
    localApiUrl(`/api/v1/production/${productionId}/image`),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${loginToken}`,
      },
      body: JSON.stringify(imagePayload),
    },
  );

  if (!imageResponse.ok) {
    const detail = await imageResponse.text();
    console.warn(
      `Failed to create image old_id=${oldId}: ${imageResponse.status}${detail ? ` — ${detail}` : ""}`,
    );
    if (stats) stats.media_skipped = (stats.media_skipped ?? 0) + 1;
    return null;
  }

  const imageData = (await imageResponse.json()) as { id: number };
  const imageId = imageData.id;
  console.log(`  Created image id=${imageId} for old_id=${oldId}`);
  if (stats) stats.media_created = (stats.media_created ?? 0) + 1;

  // Hand off crop creation to crop module (allow-list in createCropsForImage only downloads matching types)
  const crops = mediaItem.crops || [];
  if (crops.length > 0) {
    console.log(
      `  Fetching crops for image ${imageId} (${crops.length} variant(s) in API payload; allow-list filters download)...`,
    );
    await createCropsForImage(crops, imageId, loginToken, stats);
  }

  return imageId;
}

/**
 * Processes a production's media gallery: fetches the full gallery and creates images + crops.
 * Accepts either an IRI string or an embedded gallery object (extracts IRI if needed).
 * This is called from the production scraper during production creation.
 */
export async function processProductionMediaGallery(
  galleryIri: string,
  productionId: number,
  authToken: string,
  loginToken: string,
  stats?: ScrapeRunStats,
): Promise<void> {
  try {
    // Fetch full gallery with complete crop data
    const galleryUrl = viernulvierApiUrl(galleryIri);
    const galleryResponse = await fetch(galleryUrl, {
      headers: {
        accept: "application/ld+json",
        "X-AUTH-TOKEN": authToken,
      },
    });

    if (!galleryResponse.ok) {
      console.warn(`Failed to fetch gallery ${galleryIri}: ${galleryResponse.status}`);
      return;
    }

    const gallery = (await galleryResponse.json()) as MediaGalleryJSON;

    if (!gallery.items) {
      console.log(`    Gallery is empty (no items)`);
      return;
    }

    console.log(`Processing ${gallery.items.length} items from gallery...`);

    for (const mediaItem of gallery.items) {
      // Create image and crops
      await createImageWithCrops(mediaItem, productionId, loginToken, stats);
    }
  } catch (err) {
    console.warn(`Error processing media gallery for production ${productionId}:`, err);
    if (stats) stats.errors = (stats.errors ?? 0) + 1;
  }
}
