import { fetchScraperJwt } from "./auth.js";
import { localApiUrl } from "./local-api.js";
import type { ScrapeRunStats } from "./scrape-stats.js";
import { viernulvierApiUrl } from "./viernulvier-api.js";
import type { Crop } from "@viernulvier/shared/types/index.js";

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
 * Payload for multipart crop upload.
 */
interface CreateCropsMultipartData {
  crops: Array<{
    filename: string;
    type: string;
    oldId?: number;
  }>;
}

/**
 * Extract ID from path (e.g., "/api/v1/media/crops/16" → 16).
 */
function extractCropId(iri: string): number {
  const idSegment = iri.split("/").pop();
  const id = idSegment !== undefined ? parseInt(idSegment, 10) : Number.NaN;
  return id;
}

/**
 * Downloads a file from a URL and returns the buffer.
 * @param authToken - Same Viernulvier token as other scraper fetches, when the URL is not public.
 */
async function downloadFile(
  url: string,
  authToken?: string,
): Promise<Buffer | null> {
  try {
    const headers: Record<string, string> = { accept: "*/*" };
    if (authToken) {
      headers["X-AUTH-TOKEN"] = authToken;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
      console.warn(`Failed to download file ${url}: ${response.status}`);
      return null;
    }
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  } catch (err) {
    console.warn(`Error downloading file ${url}:`, err);
    return null;
  }
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
  imageId: number,
  loginToken: string,
): Promise<number | null> {
  const url = new URL(localApiUrl(`/api/v1/image/${imageId}/crop`));
  url.searchParams.set("oldId", String(oldId));

  const response = await fetch(url.toString(), {
    headers: {
      "Authorization": `Bearer ${loginToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch crop from local API: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as Crop[];
  if (data.length === 0) return null;
  if (data.length > 1) {
    throw new Error(`Multiple crops found with old_id ${oldId}`);
  }
  return data[0]!.id;
}

/**
 * Creates crops for an image from an array of crop objects.
 * Downloads the actual crop files and uploads them via multipart.
 * Called by image scraper after creating an image.
 */
export async function createCropsForImage(
  crops: MediaItemCropJSON[],
  imageId: number,
  loginToken: string,
  stats?: ScrapeRunStats,
): Promise<number> {
  if (crops.length === 0) {
    return 0;
  }

  // Prepare all crops - check which ones need to be uploaded
  const cropsToUpload: Array<{
    crop: MediaItemCropJSON;
    fileBuffer: Buffer;
  }> = [];

  for (const crop of crops) {
    if (!crop.url) {
      console.warn(`Skipping crop "${crop.name}": no URL provided`);
      if (stats) stats.crop_skipped = (stats.crop_skipped ?? 0) + 1;
      continue;
    }

    const oldId = extractCropId(crop["@id"]);
    if (!Number.isFinite(oldId)) {
      console.warn(`Skipping crop: could not parse legacy id from ${crop["@id"]}`);
      if (stats) stats.crop_skipped = (stats.crop_skipped ?? 0) + 1;
      continue;
    }

    // Check if crop already exists
    try {
      const existing = await fetchLocalCropIdByOldId(oldId, imageId, loginToken);
      if (existing !== null) {
        console.log(`Crop old_id=${oldId} already exists, skipping`);
        if (stats) stats.crop_existing = (stats.crop_existing ?? 0) + 1;
        continue;
      }
    } catch (err) {
      console.warn(`Error checking if crop exists ${oldId}:`, err);
      if (stats) stats.crop_skipped = (stats.crop_skipped ?? 0) + 1;
      continue;
    }

    // Download the file (Viernulvier may require the same X-AUTH-TOKEN as the API)
    const fileBuffer = await downloadFile(crop.url, loginToken);
    if (!fileBuffer) {
      console.warn(`Failed to download crop file: ${crop.url}`);
      if (stats) stats.crop_skipped = (stats.crop_skipped ?? 0) + 1;
      continue;
    }

    cropsToUpload.push({ crop, fileBuffer });
  }

  if (cropsToUpload.length === 0) {
    console.log(`No crops to upload for image ${imageId}`);
    return 0;
  }

  // Upload crops in batches to avoid exceeding payload size limits
  const batchSize = 5;
  let totalUploaded = 0;

  for (let batchStart = 0; batchStart < cropsToUpload.length; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, cropsToUpload.length);
    const batch = cropsToUpload.slice(batchStart, batchEnd);

    const cropMappings: CreateCropsMultipartData["crops"] = [];
    const files = new Map<string, Buffer>();

    for (let i = 0; i < batch.length; i++) {
      // eslint-disable-next-line @typescript-eslint/detect-non-null-assertion
      const { crop, fileBuffer } = batch[i]!;
      const filename = `crop-${batchStart + i}`;
      files.set(filename, fileBuffer);
      const legacyCropId = extractCropId(crop["@id"]);
      cropMappings.push({
        filename,
        type: crop.name,
        ...(Number.isFinite(legacyCropId) ? { oldId: legacyCropId } : {}),
      });
    }

    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append("data", JSON.stringify({ crops: cropMappings }));

    for (const [filename, buffer] of files) {
      const blob = new Blob([new Uint8Array(buffer)]);
      formData.append(filename, blob, filename);
    }

    // Send multipart request for this batch
    try {
      const response = await fetch(
        localApiUrl(`/api/v1/image/${imageId}/crop`),
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${loginToken}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const detail = await response.text();
        console.warn(
          `Failed to upload crop batch for image ${imageId}: ${response.status}${detail ? ` — ${detail}` : ""}`,
        );
        if (stats) stats.crop_skipped = (stats.crop_skipped ?? 0) + cropMappings.length;
        continue;
      }

      if (stats) stats.crop_created = (stats.crop_created ?? 0) + cropMappings.length;
      console.log(`    Uploaded ${cropMappings.length} crop(s) for image ${imageId} (batch ${Math.ceil((batchStart + 1) / batchSize)}/${Math.ceil(cropsToUpload.length / batchSize)})`);
      totalUploaded += cropMappings.length;
    } catch (err) {
      console.error(`Error uploading crop batch for image ${imageId}:`, err);
      if (stats) stats.errors = (stats.errors ?? 0) + 1;
    }
  }

  return totalUploaded;
}

/** Paged `GET /api/v1/image?page=&pageSize=` response (see media `fetchAllImages`). */
interface LocalImagesPageJSON {
  totalItems: number;
  member: Array<{ id: number; old_id: number | null }>;
}

/**
 * Fetches one page of local images (same contract as `GET /api/v1/image?page=&pageSize=`).
 */
async function fetchLocalImagesPage(
  page: number,
  pageSize: number,
  loginToken: string,
): Promise<LocalImagesPageJSON> {
  const url = new URL(localApiUrl("/api/v1/image"));
  url.searchParams.set("page", String(page));
  url.searchParams.set("pageSize", String(pageSize));

  const response = await fetch(url.toString(), {
    headers: {
      "Authorization": `Bearer ${loginToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Local API returned status ${response.status}`);
  }

  const data = (await response.json()) as LocalImagesPageJSON;
  if (!Array.isArray(data.member)) {
    throw new Error("Expected paged GET /api/v1/image response with { totalItems, member }");
  }
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

  const pageSize = Math.min(
    500,
    Math.max(
      1,
      parseInt(process.env["VIERNULVIER_SCRAPER_CROP_PAGE_SIZE"] ?? "100", 10),
    ),
  );

  const startPage = Math.max(
    1,
    parseInt(process.env["VIERNULVIER_SCRAPER_CROP_START_PAGE"] ?? "1", 10),
  );

  const firstPage = await fetchLocalImagesPage(1, pageSize, loginToken);
  const totalItems = firstPage.totalItems;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const envStop = process.env["VIERNULVIER_SCRAPER_CROP_STOP_BEFORE_PAGE"];
  const stopBeforePage = Math.min(
    envStop !== undefined && envStop !== ""
      ? parseInt(envStop, 10)
      : totalPages + 1,
    totalPages + 1,
  );

  console.log(
    `Scraping crops for ${totalItems} images (~${totalPages} page(s) of ${pageSize})`,
  );
  console.log(
    `Scraping crop pages ${startPage} to ${stopBeforePage - 1} (inclusive, exclusive end ${stopBeforePage})`,
  );

  for (let page = startPage; page < stopBeforePage; page++) {
    console.log(`[Page ${page}/${totalPages}] Scraping image crops...`);

    try {
      const imagesPage =
        page === 1 && startPage === 1
          ? firstPage
          : await fetchLocalImagesPage(page, pageSize, loginToken);

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

        const importedCount = await createCropsForImage(
          crops,
          imageId,
          loginToken,
          stats,
        );
        if (importedCount > 0) {
          console.log(
            `  → Uploaded ${importedCount} crop(s) for image id=${imageId}`,
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
