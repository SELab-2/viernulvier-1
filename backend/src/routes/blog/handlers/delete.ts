import type { Blog } from "@viernulvier/shared/index.js";
import { BlogSchema, stringToInt } from "@viernulvier/shared/index.js";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { parseParams, buildQuery } from "@/routes/helpers.js";
import { z } from "zod";

const deleteBlogById = (server: FastifyInstance) =>
  buildQuery(
    server,
    `DELETE FROM blog WHERE id = $1
     RETURNING id, name, description`,
    z.tuple([z.int()]),
    BlogSchema,
  );

/**
 * Deletes a blog by ID and returns the deleted record.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The deleted blog, or `null` if not found or parsing failed.
 */
export async function deleteBlog(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Blog | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const rows = await deleteBlogById(server)(id);
  return rows[0] ?? null;
}
