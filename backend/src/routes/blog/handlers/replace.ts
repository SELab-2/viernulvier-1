import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Blog } from "@viernulvier/shared/index.js";
import { BlogSchema, serial } from "@viernulvier/shared/index.js";
import { getMetadata, parseParams, buildQuery, parseSchema } from "@/routes/helpers.js";
import { z } from "zod";

export const ReplaceBlogBodySchema = BlogSchema.omit({ id: true });

const replaceBlogQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `UPDATE blog SET name = $1, description = $2, updated_by = $3, updated_at = $4
     WHERE id = $5
     RETURNING id, name, description`,
    z.tuple([
      z.string(),            // name
      z.string().nullable(), // description
      z.int(),               // admin
      z.date(),              // current_time
      z.int(),               // id
    ]),
    BlogSchema,
  );

/**
 * Replaces an existing blog's data and returns the updated record.
 * Unlike `editBlog`, all fields are required and will be overwritten.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `name` and `description` in its body.
 * @returns The updated blog, or `null` if the update failed or parsing failed.
 */
export async function replaceBlog(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Blog | null> {
  const { id } = parseParams(request, z.object({ id: serial() }));
  const body = parseSchema(server, ReplaceBlogBodySchema, request.body);
  const { admin, current_time } = getMetadata(request);

  const rows = await replaceBlogQuery(server)(
    body["name"],
    body["description"],
    admin,
    current_time,
    id,
  );

  return rows[0] ?? null;
}
