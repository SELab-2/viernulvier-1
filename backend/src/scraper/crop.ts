import { fetchScraperJwt } from "./auth.js";
import { totalPagesFromHydraView } from "./hydra-view.js";
import { localApiUrl } from "./local-api.js";
import type { ScrapeRunStats } from "./scrape-stats.js";
import { viernulvierApiUrl } from "./viernulvier-api.js";

/**
 * Raw media item crop from Viernulvier JSON-LD.
 */
export interface MediaItemCropJSON {
  "@id": string;
  "@type": string;
  name: string;
  url?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Raw media item from Viernulvier (minimal, crops from item detail).
 */
interface MediaItemJSON {
  "@id": string;
  "@type": string;
  type: "foto" | "video";
  original_filename?: string;
  position?: number;
  width?: number;
  height?: number;
  format?: string;
  crops: MediaItemCropJSON[];
}

/**
 * Create payload for local crop endpoint.
 */
export interface CreateCropBody {
  old_id: number;
  name: string;
  url?: string | null;
}

/**
 * Extract ID from @id path (e.g., "/api/v1/media/crops/16" → 16).
 */
function extractCropId(iri: string): number {
  const idSegment = iri.split("/").pop();
  const id = idSegment !== undefined ? parseInt(idSegment, 10) : Number.NaN;
  return id;
}

/**
 * Fetches a media item detail from Viernulvier to get its crops.
 */
async function fetchMediaItemWithCrops(
  itemId: number,
  authToken: string,
): Promise<MediaItemJSON | null> {
  try {
    const itemUrl = viernulvierApiUrl(`/api/v1/media/items/${itemId}`);
    const response = await fetch(itemUrl, {
      headers: {
        accept: "application/ld+json",
        "X-AUTH-TOKEN": authToken,
      },
    });

    if (!response.ok) {
      if (response.status !== 404) {
        console.warn(
          `Failed to fetch media item ${itemId}: ${response.status}`,
        );
      }
      return null;
    }

    const data = (await response.json()) as MediaItemJSON;
    return data;
  } catch (err) {
    console.warn(`Error fetching media item ${itemId}:`, err);
    return null;
  }
}

/**
 * Fetches local crop ID by old_id to check if already imported.
 */
async function fetchLocalCropIdByOldId(
  oldId: number,
  loginToken: string,
): Promise<number | null> {
  const response = await fetch(
    localApiUrl(`/api/v1/crop/by-old-id/${oldId}`),
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
      `Failed to check local crop old_id=${oldId}: ${response.status}`,
    );
    return null;
  }

  const data = (await response.json()) as { id: number };
  return data.id;
}

/**
 * Creates crop locally and returns the created crop ID, or null on failure.
 */
async function createLocalCropFromViernulvierJson(
  crop: MediaItemCropJSON,
  imageId: number,
  loginToken: string,
  stats?: ScrapeRunStats,
): Promise<number | null> {
  const oldId = extractCropId(crop["@id"]);

  if (!Number.isFinite(oldId)) {
    console.warn(`Skipping crop: could not parse legacy id from ${crop["@id"]}`);
    if (stats) stats.crop_skipped = (stats.crop_skipped ?? 0) + 1;
    return null;
  }

  const payload: CreateCropBody = {
    old_id: oldId,
    name: crop.name,
    url: crop.url || null,
  };

  const response = await fetch(
    localApiUrl(`/api/v1/image/${imageId}/crop`),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${loginToken}`,
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    console.warn(
      `Failed to create crop old_id=${oldId}: ${response.status}${detail ? ` — ${detail}` : ""}`,
    );
    if (stats) stats.crop_skipped = (stats.crop_skipped ?? 0) + 1;
    return null;
  }

  const cropId = ((await response.json()) as { id: number }).id;
  if (stats) stats.crop_created = (stats.crop_created ?? 0) + 1;
  return cropId;
}

/**
 * Creates crop if not already present; returns the crop ID or null.
 */
async function ensureCropImported(
  crop: MediaItemCropJSON,
  imageId: number,
  loginToken: string,
  stats?: ScrapeRunStats,
): Promise<number | null> {
  const oldId = extractCropId(crop["@id"]);

  if (!Number.isFinite(oldId)) {
    console.warn(`Skipping crop: could not parse legacy id from ${crop["@id"]}`);
    if (stats) stats.crop_skipped = (stats.crop_skipped ?? 0) + 1;
    return null;
  }

  const existing = await fetchLocalCropIdByOldId(oldId, loginToken);
  if (existing !== null) {
    console.log(
      `Crop old_id=${oldId} already exists locally (id=${existing}), skipping create`,
    );
    if (stats) stats.crop_existing = (stats.crop_existing ?? 0) + 1;
    return existing;
  }

  return createLocalCropFromViernulvierJson(
    crop,
    imageId,
    loginToken,
    stats,
  );
}

/**
 * Creates crops for an image from an array of crop objects.
 * Called by image scraper after creating an image.
 */
export async function createCropsForImage(
  crops: MediaItemCropJSON[],
  imageId: number,
  loginToken: string,
  stats?: ScrapeRunStats,
): Promise<number> {
  let cropsCreated = 0;

  for (const crop of crops) {
    const imported = await ensureCropImported(crop, imageId, loginToken, stats);
    if (imported !== null) {
      cropsCreated++;
    }
  }

  return cropsCreated;
}

/**
 * Raw image collection response from local API.
 */
interface LocalImageListJSON {
  totalItems: number;
  member: Array<{ id: number; old_id: number | null }>;
  view?: {
    first?: string;
    last?: string;
    next?: string;
  };
}

/**
 * Fetches a page of local images that need crops imported.
 */
async function fetchLocalImagesPage(
  page: number = 1,
  loginToken: string,
): Promise<LocalImageListJSON> {
  const url = new URL(localApiUrl("/api/v1/image"));
  url.searchParams.append("page", page.toString());

  const response = await fetch(url.toString(), {
    headers: {
      "Authorization": `Bearer ${loginToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Local API returned status ${response.status}`);
  }

  const data = (await response.json()) as LocalImageListJSON;
  return data;
}

/**
 * Full crop scraper: scrapes crops for all images.
 * Requires images to already be imported into local DB.
 */
export async function scrapeCrops(
  stats?: ScrapeRunStats,
): Promise<void> {
  console.log("Starting crop scraper...");

  const authToken = await fetchScraperJwt();
  const loginToken = authToken;

  // Fetch metadata to determine total pages
  const meta = await fetchLocalImagesPage(1, loginToken);
  const view = meta.view;

  let totalPages = 1;
  if (view) {
    totalPages = totalPagesFromHydraView(view, meta.totalItems);
  }

  console.log(`Scraping crops for ${meta.totalItems} images across ~${totalPages} pages`);

  // Parse page range from environment variables
  const startPage = parseInt(
    process.env["VIERNULVIER_SCRAPER_CROP_START_PAGE"] ?? "1",
    10,
  );
  const stopBeforePage = parseInt(
    process.env["VIERNULVIER_SCRAPER_CROP_STOP_BEFORE_PAGE"] ??
      (totalPages + 1).toString(),
    10,
  );

  console.log(
    `Scraping crop pages ${startPage} to ${stopBeforePage - 1} (inclusive)`,
  );

  for (let page = startPage; page < stopBeforePage; page++) {
    console.log(`[Page ${page}/${totalPages - 1}] Scraping image crops...`);

    try {
      const imagesPage = await fetchLocalImagesPage(page, loginToken);

      for (const image of imagesPage.member) {
        const imageId = image.id;
        const oldId = image.old_id;

        if (!oldId || !Number.isFinite(oldId)) {
          console.log(
            `Image id=${imageId} has no valid old_id, skipping crop import`,
          );
          continue;
        }

        // Fetch media item detail from Viernulvier which includes crops array
        const mediaItem = await fetchMediaItemWithCrops(oldId, authToken);
        if (!mediaItem) {
          continue;
        }

        const crops = mediaItem.crops || [];
        if (crops.length === 0) {
          continue;
        }

        let importedCount = 0;
        for (const crop of crops) {
          const imported = await ensureCropImported(
            crop,
            imageId,
            loginToken,
            stats,
          );
          if (imported !== null) {
            importedCount++;
          }
        }

        if (importedCount > 0) {
          console.log(
            `  → Imported ${importedCount} crops for image id=${imageId}`,
          );
        }
      }
    } catch (err) {
      console.error(`Failed to scrape crops page ${page}:`, err);
      if (stats) stats.errors = (stats.errors ?? 0) + 1;
    }
  }

  console.log("Crop scraper completed.");
}
