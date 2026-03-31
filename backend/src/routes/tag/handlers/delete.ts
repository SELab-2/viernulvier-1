import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Tag } from "@viernulvier/shared/index.js";
import { TagSchema, stringToInt } from "@viernulvier/shared/index.js";
import { parseParams, buildQuery } from "@/routes/helpers.js";
import { z } from "zod";

const deleteTagById = (server: FastifyInstance) =>
  buildQuery(
    server,
    `DELETE FROM tag
     WHERE id = $1
     RETURNING id, name, tag_type, public`,
    z.tuple([z.int()]),
    TagSchema,
  );

/**
 * Deletes a tag by ID and returns the deleted row.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The deleted tag, or `null` if no row was deleted or parsing failed.
 */
export async function deleteTag(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Tag | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const rows = await deleteTagById(server)(id);
  return rows[0] ?? null;
}
