import type { FastifyInstance, FastifyRequest } from "fastify";
import type { TagType } from "@viernulvier/shared/index.js";
import { TagTypeSchema, stringToInt } from "@viernulvier/shared/index.js";
import { parseParams, buildQuery } from "@/routes/helpers.js";
import { z } from "zod";

const deleteTagTypeById = (server: FastifyInstance) =>
  buildQuery(
    server,
    `DELETE FROM tag_type
     WHERE id = $1
     RETURNING id, name`,
    z.tuple([z.int()]),
    TagTypeSchema,
  );

/**
 * Deletes a tag type by ID and returns the deleted row.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The deleted tag type, or `null` if no row was deleted or parsing failed.
 */
export async function deleteTagType(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<TagType | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const rows = await deleteTagTypeById(server)(id);
  return rows[0] ?? null;
}
