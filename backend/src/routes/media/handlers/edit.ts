import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Crop, Image } from "@viernulvier/shared/index.js";
import { serial, stringToInt } from "@viernulvier/shared/index.js";
import {
  HttpClientError,
  HttpError,
  getMetadata,
  parseParams,
  parseSchema,
} from "@/routes/helpers.js";
import { getImageById, getCropById } from "./fetch.js";
import { PatchImageBodySchema, PatchCropBodySchema } from "./body-schema.js";
import { hasOwn, getNullableFieldValue } from "./field-utils.js";
import { parseMultipart } from "./multipart-helpers.js";
import {
  uploadToS3,
  deleteFromS3,
  buildCropPath,
  generateS3Key,
  extractS3Key,
} from "./s3-utils.js";
import z from "zod";

const NullableImageColumns = ["res", "old_id"] as const;

/**
 * PATCH /api/v1/image/:id
 *
 * Partially updates an image's fields (`res`, `old_id`).
 * Does not handle crops — use the crop endpoints for that.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in params and a partial image body.
 * @returns The updated image with its crops, or `null` if not found.
 */
export async function editImage(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<(Image & { crops: Crop[] }) | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const body = parseSchema(server, PatchImageBodySchema, request.body);

  const { admin, current_time } = getMetadata(request);

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const addField = (column: string, value: unknown) => {
    /* c8 ignore next */
    if (value === undefined) return;
    fields.push(`${column} = $${i++}`);
    values.push(value);
  };

  for (const column of NullableImageColumns) {
    if (hasOwn(body, column)) {
      addField(column, getNullableFieldValue(body, column));
    }
  }

  if (fields.length === 0) {
    throw new HttpError(HttpClientError.BadRequest, "No fields to update");
  }

  // Always update metadata
  fields.push(`updated_by = $${i++}`, `updated_at = $${i++}`);
  values.push(admin, current_time, id);

  const result = await server.pg.query(
    `UPDATE image SET ${fields.join(", ")} WHERE id =$${i}
    RETURNING id`,
    values,
  );

  if (result.rowCount === 0) {
    throw new HttpError(HttpClientError.NotFound, "Image not found");
  }

  return await getImageById(server, id);
}

/**
 * PATCH /api/v1/crop/:id
 *
 * Partially updates a crop. Supports two modes:
 * - **JSON body** — change `type` only (no file replacement).
 * - **Multipart** — optionally change `type` and/or replace the file.
 *   The `data` field contains JSON with an optional `type`.
 *   A single uploaded file replaces the existing crop file in S3.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in params.
 * @returns The updated crop, or `null` if not found.
 */
export async function editCrop(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Crop | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const { admin, current_time } = getMetadata(request);

  // Fetch existing crop
  const existing = await getCropById(server, id);
  if (!existing) {
    throw new HttpError(HttpClientError.NotFound, "Crop not found");
  }

  let body: z.infer<typeof PatchCropBodySchema>;
  let newFile: { buffer: Buffer; mimetype: string } | null = null;

  if (request.isMultipart()) {
    const parsed = await parseMultipart(request);
    body = parseSchema(server, PatchCropBodySchema, parsed.data);
    // Take the first uploaded file (only one file expected for single crop edit)
    const firstFile = parsed.files.values().next().value;
    newFile = firstFile ?? null;
  } else {
    body = parseSchema(server, PatchCropBodySchema, request.body);
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  // Optionally update type
  if (hasOwn(body, "type") && body.type !== undefined) {
    fields.push(`type = $${i++}`);
    values.push(body.type);
  }

  // Optionally replace the file
  if (newFile) {
    const oldS3Key = extractS3Key(existing.url);
    const newS3Key = generateS3Key(
      "crop" + oldS3Key.slice(oldS3Key.lastIndexOf(".")),
    );
    await uploadToS3(
      server.s3.client,
      newS3Key,
      newFile.buffer,
      newFile.mimetype,
    );
    await deleteFromS3(server.s3.client, oldS3Key);

    const newPath = buildCropPath(newS3Key);
    fields.push(`url = $${i++}`);
    values.push(newPath);
  }

  if (fields.length === 0) {
    throw new HttpError(HttpClientError.BadRequest, "No fields to update");
  }

  // Always update metadata
  fields.push(`updated_by = $${i++}`, `updated_at = $${i++}`);
  values.push(admin, current_time, id);

  await server.pg.query(
    `UPDATE crop SET ${fields.join(", ")} WHERE id = $${i}
     RETURNING id`,
    values,
  );

  return await getCropById(server, id);
}
