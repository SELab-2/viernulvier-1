import {
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import type { S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const BUCKET = "crops";
const PATH_PREFIX = "/media/crops";

/**
 * Builds the path for a crop stored in Garage.
 * Nginx forwards `/media/crops/*` → `http://viernulvier-garage:3900/crops/*`.
 *
 * @param s3Key - The object key inside the crops bucket.
 * @returns Path string, e.g. `/media/crops/abc-uuid.jpg`
 */
export function buildCropPath(s3Key: string): string {
  return `${PATH_PREFIX}/${s3Key}`;
}

/**
 * Extracts the S3 object key from a stored crop path.
 *
 * @param path - The path, e.g. `/media/crops/abc.jpg`
 * @returns The object key, e.g. `abc.jpg`
 */
export function extractS3Key(path: string): string {
  const prefix = `${PATH_PREFIX}/`;
  if (path.startsWith(prefix)) {
    return path.slice(prefix.length);
  }
  return path.split("/").pop() ?? path;
}

/**
 * Generates a unique S3 key from the original filename, preserving the
 * file extension.
 *
 * @param originalFilename - The filename as provided by the client.
 * @returns A UUID-based key, e.g. `a3b8c9d1-xxxx-xxxx-xxxx-xxxxxxxxxxxx.jpg`
 */
export function generateS3Key(originalFilename: string): string {
  const dotIdx = originalFilename.lastIndexOf(".");
  const ext = dotIdx !== -1 ? originalFilename.slice(dotIdx) : "";
  return `${randomUUID()}${ext}`;
}

/**
 * Uploads a file buffer to the crops bucket in Garage.
 *
 * @param s3 - The S3Client instance.
 * @param s3Key - The object key to store the file under.
 * @param buffer - The file contents.
 * @param mimeType - The MIME type of the file (e.g. `image/jpeg`).
 */
export async function uploadToS3(
  s3: S3Client,
  s3Key: string,
  buffer: Buffer,
  mimeType: string,
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );
}

/**
 * Deletes a single object from the crops bucket in Garage.
 *
 * @param s3 - The S3Client instance.
 * @param s3Key - The object key to delete.
 */
export async function deleteFromS3(
  s3: S3Client,
  s3Key: string,
): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
    }),
  );
}

/**
 * Deletes multiple objects from the crops bucket in Garage.
 *
 * @param s3 - The S3Client instance.
 * @param paths - Array of crop paths to delete (e.g. `/media/crops/abc.jpg`).
 */
export async function deleteManyFromS3(
  s3: S3Client,
  paths: string[],
): Promise<void> {
  await Promise.all(
    paths.map((path) => deleteFromS3(s3, extractS3Key(path))),
  );
}