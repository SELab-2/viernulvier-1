import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Crop, Image } from "@viernulvier/shared/index.js";
import { stringToInt } from "@viernulvier/shared/index.js";
import {
  HttpClientError,
  HttpError,
  parseParams,
} from "@/routes/helpers.js";
import { getCropById, /* getCropsByImageId, */ getImageById } from "./fetch.js";
import { deleteFromS3, deleteManyFromS3, extractS3Key } from "./s3-utils.js";
import z from "zod";

/**
 * DELETE /api/v1/image/:id
 *
 * Deletes an image and all its crops. Removes crop files from S3 first,
 * then deletes the image row (which cascades to crop rows in the DB).
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in params.
 * @returns The deleted image (with its crops) as it was before deletion, or `null` if not found.
 */
export async function deleteImage(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<(Image & { crops: Crop[] }) | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));

  // Fetch the image + crops before deletion (to return and to get S3 keys)
  const image = await getImageById(server, id);
  if (!image) {
    throw new HttpError(HttpClientError.NotFound, "Image not found");
  }

  // Delete all crop files from S3
  const cropUrls = image.crops.map((c) => c.url);
  if (cropUrls.length > 0) {
    await deleteManyFromS3(server.s3, cropUrls);
  }

  // Delete image row (cascades to crop rows)
  await server.pg.query("DELETE FROM image WHERE id = $1", [id]);

  return image;
}

/**
 * DELETE /api/v1/crop/:id
 *
 * Deletes a single crop. Removes the file from S3, then deletes the row.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in params.
 * @returns The deleted crop as it was before deletion, or `null` if not found.
 */
export async function deleteCrop(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Crop | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));

  const crop = await getCropById(server, id);
  if (!crop) {
    throw new HttpError(HttpClientError.NotFound, "Crop not found");
  }

  // Delete file from S3
  await deleteFromS3(server.s3, extractS3Key(crop.url));

  // Delete row
  await server.pg.query("DELETE FROM crop WHERE id = $1", [id]);

  return crop;
}