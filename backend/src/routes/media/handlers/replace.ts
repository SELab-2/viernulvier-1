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
import { getImageById, getCropById, /*getCropsByImageId*/ } from "./fetch.js";
import { ReplaceImageBodySchema, ReplaceCropBodySchema } from "./body-schema.js";
import { parseMultipart } from "./create.js";
import {
  uploadToS3,
  deleteFromS3,
  deleteManyFromS3,
  buildCropPath,
  generateS3Key,
  extractS3Key,
} from "./s3-utils.js";
import z from "zod";

/**
 * PUT /api/v1/image/:id
 *
 * Replaces an image's fields entirely. If `crops` are provided in the body,
 * all existing crops are deleted (from S3 + DB) and replaced with the new ones.
 *
 * Supports two modes:
 * - **JSON body** — replaces image fields only, no crop changes.
 * - **Multipart** — replaces image fields and all crops. The `data` field
 *   contains JSON with image fields and a `crops` array of `{ filename, type }`
 *   pairs. All existing crops are removed and replaced.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in params.
 * @returns The replaced image with its crops, or `null` if not found.
 */
export async function replaceImage(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<(Image & { crops: Crop[] }) | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const { admin, current_time } = getMetadata(request);

  // Verify image exists
  const existing = await getImageById(server, id);
  if (!existing) {
    throw new HttpError(HttpClientError.NotFound, "Image not found");
  }

  let body: z.infer<typeof ReplaceImageBodySchema>;
  let files = new Map<string, { buffer: Buffer; mimetype: string }>();

  if (request.isMultipart()) {
    const parsed = await parseMultipart(request);
    body = parseSchema(server, ReplaceImageBodySchema, parsed.data);
    files = parsed.files;
  } else {
    body = parseSchema(server, ReplaceImageBodySchema, request.body);
  }

  // Replace image fields
  await server.pg.query(
    `UPDATE image
     SET res = $1, old_id = $2, updated_by = $3, updated_at = $4
     WHERE id = $5`,
    [body.res, body.old_id, admin, current_time, id],
  );

  // If crops are provided, replace all existing crops
  const cropMappings = body.crops;
  if (cropMappings) {
    // Validate that every mapping has a corresponding file
    for (const mapping of cropMappings) {
      if (!files.has(mapping.filename)) {
        throw new HttpError(
          HttpClientError.BadRequest,
          `Missing file for crop mapping: ${mapping.filename}`,
        );
      }
    }

    // Delete old crops from S3
    const oldCropUrls = existing.crops.map((c) => c.url);
    if (oldCropUrls.length > 0) {
      await deleteManyFromS3(server.s3, oldCropUrls);
    }

    // Delete old crop rows
    await server.pg.query("DELETE FROM crop WHERE image = \$1", [id]);

    // Upload and insert new crops
    for (const mapping of cropMappings) {
      const file = files.get(mapping.filename);
      if (!file) continue;

      const s3Key = generateS3Key(mapping.filename);
      await uploadToS3(server.s3, s3Key, file.buffer, file.mimetype);

      const url = buildCropPath(s3Key);
      await server.pg.query(
        `INSERT INTO crop (image, url, type, created_by, updated_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, url, mapping.type, admin, admin, current_time, current_time],
      );
    }
  }

  return await getImageById(server, id);
}

/**
 * PUT /api/v1/crop/:id
 *
 * Replaces a crop entirely — new type and new file are both required.
 * The old file is deleted from S3 and replaced with the uploaded one.
 *
 * Must be multipart. The `data` field contains JSON with `type`.
 * Exactly one file must be uploaded.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in params.
 * @returns The replaced crop, or `null` if not found.
 */
export async function replaceCrop(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Crop | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const { admin, current_time } = getMetadata(request);

  const existing = await getCropById(server, id);
  if (!existing) {
    throw new HttpError(HttpClientError.NotFound, "Crop not found");
  }

  if (!request.isMultipart()) {
    throw new HttpError(
      HttpClientError.BadRequest,
      "Expected multipart/form-data — PUT crop requires a new file",
    );
  }

  const { data, files } = await parseMultipart(request);
  const body = parseSchema(server, ReplaceCropBodySchema, data);

  if (files.size === 0) {
    throw new HttpError(
      HttpClientError.BadRequest,
      "PUT crop requires a new file upload",
    );
  }

  // Take the first (and only expected) file
  const [filename, file] = files.entries().next().value!;

  // Upload new file
  const newS3Key = generateS3Key(filename);
  await uploadToS3(server.s3, newS3Key, file.buffer, file.mimetype);

  // Delete old file
  await deleteFromS3(server.s3, extractS3Key(existing.url));

  // Update row
  const newPath = buildCropPath(newS3Key);
  await server.pg.query(
    `UPDATE crop
     SET url = $1, type = $2, updated_by = $3, updated_at = $4
     WHERE id = $5`,
    [newPath, body.type, admin, current_time, id],
  );

  return await getCropById(server, id);
}