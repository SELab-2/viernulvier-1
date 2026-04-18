import type { FastifyInstance, FastifyRequest } from "fastify";
import { HttpClientError, HttpError } from "@/routes/helpers.js";
import { uploadToS3, buildCropPath, generateS3Key } from "./s3-utils.js";
import "@fastify/multipart";

// ── Multipart parsing helper ──

/**
 * Consumes a multipart request and returns the parsed JSON from the `data`
 * field along with a map of uploaded files keyed by filename.
 *
 * @param request - The Fastify request (must be multipart).
 * @returns Parsed data and file map.
 */
export async function parseMultipart(request: FastifyRequest): Promise<{
  data: Record<string, unknown>;
  files: Map<string, { buffer: Buffer; mimetype: string }>;
}> {
  const files = new Map<string, { buffer: Buffer; mimetype: string }>();
  let data: Record<string, unknown> = {};

  const parts = request.parts();
  for await (const part of parts) {
    if (part.type === "file") {
      const buffer = await part.toBuffer();
      files.set(part.filename, { buffer, mimetype: part.mimetype });
    } else if (part.fieldname === "data") {
      try {
        data = JSON.parse(part.value as string);
      } catch {
        throw new HttpError(
          HttpClientError.BadRequest,
          "Invalid JSON in 'data' field",
        );
      }
    }
  }

  return { data, files };
}

// ── Shared crop insertion helper ──

/**
 * Uploads crop files to S3 and inserts the corresponding crop rows in the DB.
 *
 * @param server - The Fastify instance.
 * @param imageId - The parent image ID.
 * @param mappings - Array of `{ filename, type }` pairs.
 * @param files - Map of filename → buffer + mimetype.
 * @param admin - The ID of the admin performing the action.
 * @param currentTime - The current timestamp for metadata.
 */
export async function insertCrops(
  server: FastifyInstance,
  imageId: number,
  mappings: { filename: string; type: string }[],
  files: Map<string, { buffer: Buffer; mimetype: string }>,
  admin: number,
  currentTime: Date,
): Promise<void> {
  for (const mapping of mappings) {
    const file = files.get(mapping.filename);
    if (!file) continue; // already validated by caller

    const s3Key = generateS3Key(mapping.filename);
    await uploadToS3(server.s3.client, s3Key, file.buffer, file.mimetype);

    const url = buildCropPath(s3Key);
    await server.pg.query(
      `INSERT INTO crop (image, url, type, created_by, updated_by, created_at, updated_at)
       VALUES (\$1, \$2, \$3, \$4, \$5, \$6, \$7)`,
      [imageId, url, mapping.type, admin, admin, currentTime, currentTime],
    );
  }
}

// ── Validation helper ──

/**
 * Validates that every crop mapping has a corresponding uploaded file.
 *
 * @param mappings - The crop mappings from the request body.
 * @param files - The uploaded files.
 * @throws HttpError if any mapping is missing a file.
 */
export function validateCropFiles(
  mappings: { filename: string; type: string }[],
  files: Map<string, { buffer: Buffer; mimetype: string }>,
): void {
  for (const mapping of mappings) {
    if (!files.has(mapping.filename)) {
      throw new HttpError(
        HttpClientError.BadRequest,
        `Missing file for crop mapping: ${mapping.filename}`,
      );
    }
  }
}