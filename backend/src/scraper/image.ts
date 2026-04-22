import { localApiUrl } from "./local-api.js";
import type { ScrapeRunStats } from "./scrape-stats.js";
import { viernulvierApiUrl } from "./viernulvier-api.js";
import { createCropsForImage } from "./crop.js";

/**
 * Raw media gallery from Viernulvier JSON-LD.
 */
export interface MediaGalleryJSON {
  "@id": string;
  "@type": string;
  name?: string;
  items?: string[]; // Array of media item IRIs
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
  const response = await fetch(
    localApiUrl(`/api/v1/image/by-old-id/${oldId}`),
    {
      headers: {
        "Authorization": `Bearer ${loginToken}`,
      },
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    console.warn(
      `Failed to check local image old_id=${oldId}: ${response.status}`,
    );
    return null;
  }

  const data = (await response.json()) as { id: number };
  return data.id;
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
  if (stats) stats.media_created = (stats.media_created ?? 0) + 1;

  // Hand off crop creation to crop module
  const crops = mediaItem.crops || [];
  if (crops.length > 0) {
    const cropsCreated = await createCropsForImage(crops, imageId, loginToken, stats);
    if (cropsCreated > 0) {
      console.log(`    Created image with ${cropsCreated} crop(s)`);
    }
  }

  return imageId;
}

/**
 * Processes a production's media gallery: fetches items and creates images + crops.
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
    // Fetch gallery
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
    const itemIris = gallery.items || [];

    if (itemIris.length === 0) {
      console.log(`    Gallery is empty`);
      return;
    }

    console.log(`    Processing ${itemIris.length} items from gallery...`);

    for (const itemIri of itemIris) {
      const itemId = extractIdFromIri(itemIri);
      if (!itemId) continue;

      // Fetch media item with crops embedded
      const itemUrl = viernulvierApiUrl(`/api/v1/media/items/${itemId}`);
      const itemResponse = await fetch(itemUrl, {
        headers: {
          accept: "application/ld+json",
          "X-AUTH-TOKEN": authToken,
        },
      });

      if (!itemResponse.ok) {
        console.warn(`Failed to fetch media item ${itemId}: ${itemResponse.status}`);
        continue;
      }

      const mediaItem = (await itemResponse.json()) as MediaItemJSON;

      // Create image and crops
      await createImageWithCrops(mediaItem, productionId, loginToken, stats);
    }
  } catch (err) {
    console.warn(`Error processing media gallery ${galleryIri}:`, err);
    if (stats) stats.errors = (stats.errors ?? 0) + 1;
  }
}
