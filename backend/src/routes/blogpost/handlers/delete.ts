import type { BlogPost } from "@viernulvier/shared/index.js";
import { BlogPostSchema, serial } from "@viernulvier/shared/index.js";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { parseParams, buildQuery } from "@/routes/helpers.js";
import { z } from "zod";

const deleteBlogPostById = (server: FastifyInstance) =>
  buildQuery(
    server,
    `DELETE FROM blogpost WHERE id = $1
     RETURNING id, blog, title, content, published_at`,
    z.tuple([z.int()]),
    BlogPostSchema,
  );

/**
 * Deletes a blogpost by ID and returns the deleted record.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The deleted blogpost, or `null` if not found or parsing failed.
 */
export async function deleteBlogPost(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<BlogPost | null> {
  const { id } = parseParams(request, z.object({ id: serial() }));
  const rows = await deleteBlogPostById(server)(id);
  return rows[0] ?? null;
}
