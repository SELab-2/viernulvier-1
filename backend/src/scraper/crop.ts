import { localApiUrl } from "./local-api.js";
import type { ScrapeRunStats } from "./scrape-stats.js";
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
 * Downloads a file from a public asset URL and returns the buffer.
 * (Crop URLs are typically CDN / static URLs, not the authenticated JSON API.)
 */
async function downloadFile(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      headers: { accept: "*/*" },
    });
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

    const fileBuffer = await downloadFile(crop.url);
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
      // eslint-disable-next-line security/detect-object-injection
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
