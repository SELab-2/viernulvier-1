import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Crop, Image } from "@viernulvier/shared/index.js";
import { stringToInt } from "@viernulvier/shared/index.js";
import {
  HttpClientError,
  HttpError,
  getMetadata,
  parseParams,
  parseSchema,
} from "@/routes/helpers.js";
import { getImageById, getCropsByImageId } from "./fetch.js";
import { CreateImageBodySchema, CreateCropBodySchema } from "./body-schema.js";
import { uploadToS3, buildCropPath, generateS3Key } from "./s3-utils.js";
import z from "zod";
import "@fastify/multipart";

// ── Multipart parsing helper ──

/**
 * Consumes a multipart request and returns the parsed JSON from the `data`
 * field along with a map of uploaded files keyed by filename.
 *
 * @param request - The Fastify request (must be multipart).
 * @returns Parsed data and file map.
 */
async function parseMultipart(request: FastifyRequest): Promise<{
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
async function insertCrops(
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
    await uploadToS3(server.s3, s3Key, file.buffer, file.mimetype);

    const url = buildCropPath(s3Key);
    await server.pg.query(
      `INSERT INTO crop (image, url, type, created_by, updated_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [imageId, url, mapping.type, admin, admin, currentTime, currentTime],
    );
  }
}

/**
 * Validates that every crop mapping has a corresponding uploaded file.
 *
 * @param mappings - The crop mappings from the request body.
 * @param files - The uploaded files.
 * @throws HttpError if any mapping is missing a file.
 */
function validateCropFiles(
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

// ── Route handlers ──

/**
 * POST /api/v1/production/:productionId/image
 *
 * Creates a new image for a production. Supports two modes:
 * - **JSON body** — creates the image row only (no crops).
 * - **Multipart** — creates the image row and uploads crops in a single request
 *   (oneshot). The `data` field contains JSON with image fields and a `crops`
 *   array of `{ filename, type }` pairs. Each filename must match one of the
 *   uploaded file parts.
 *
 * @returns The newly created image with its crops.
 */
export async function createImage(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<(Image & { crops: Crop[] }) | null> {
  const { productionId } = parseParams(
    request,
    z.object({ productionId: stringToInt }),
  );
  const { admin, current_time } = getMetadata(request);

  let body: z.infer<typeof CreateImageBodySchema>;
  let files = new Map<string, { buffer: Buffer; mimetype: string }>();

  if (request.isMultipart()) {
    const parsed = await parseMultipart(request);
    body = parseSchema(server, CreateImageBodySchema, parsed.data);
    files = parsed.files;
  } else {
    body = parseSchema(server, CreateImageBodySchema, request.body);
  }

  const cropMappings = body.crops ?? [];
  validateCropFiles(cropMappings, files);

  // Insert image row
  const imageResult = await server.pg.query<{ id: number }>(
    `INSERT INTO image (production, res, old_id, created_by, updated_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      productionId,
      body.res ?? null,
      body.old_id ?? null,
      admin,
      admin,
      current_time,
      current_time,
    ],
  );

  const imageRow = imageResult.rows[0];
  if (!imageRow) return null;

  // Upload and insert crops
  await insertCrops(server, imageRow.id, cropMappings, files, admin, current_time);

  return await getImageById(server, imageRow.id);
}

/**
 * POST /api/v1/image/:imageId/crop
 *
 * Uploads one or more crops to an existing image. The request must be
 * multipart. The `data` field contains JSON with a `crops` array of
 * `{ filename, type }` pairs.
 *
 * @returns All crops for the image after insertion.
 */
export async function createCrops(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Crop[] | null> {
  const { imageId } = parseParams(
    request,
    z.object({ imageId: stringToInt }),
  );
  const { admin, current_time } = getMetadata(request);

  if (!request.isMultipart()) {
    throw new HttpError(
      HttpClientError.BadRequest,
      "Expected multipart/form-data",
    );
  }

  const { data, files } = await parseMultipart(request);
  const body = parseSchema(server, CreateCropBodySchema, data);

  validateCropFiles(body.crops, files);

  // Verify image exists
  const imageCheck = await server.pg.query(
    "SELECT id FROM image WHERE id = \$1",
    [imageId],
  );
  if (imageCheck.rows.length === 0) {
    throw new HttpError(HttpClientError.NotFound, "Image not found");
  }

  // Upload and insert crops
  await insertCrops(server, imageId, body.crops, files, admin, current_time);

  return await getCropsByImageId(server, imageId);
}