import type { FastifyInstance, FastifyRequest } from "fastify";
import type { BlogPost } from "@viernulvier/shared/index.js";
import { BlogPostSchema, stringToInt } from "@viernulvier/shared/index.js";
import { getMetadata, parseParams, buildQuery, parseSchema } from "@/routes/helpers.js";
import { z } from "zod";

export const ReplaceBlogPostBodySchema = BlogPostSchema.omit({ id: true });

const replaceBlogPostQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `UPDATE blogpost
     SET blog = $1, title = $2, content = $3, published_at = $4, updated_by = $5, updated_at = $6
     WHERE id = $7
     RETURNING id, blog, title, content, published_at`,
    z.tuple([
      ReplaceBlogPostBodySchema.shape.blog,
      ReplaceBlogPostBodySchema.shape.title,
      ReplaceBlogPostBodySchema.shape.content,
      ReplaceBlogPostBodySchema.shape.published_at,
      z.int(),
      z.date(),
      z.int(),
    ]),
    BlogPostSchema,
  );

/**
 * Replaces an existing blogpost's data and returns the updated record.
 * Unlike `editBlogPost`, all fields are required and will be overwritten.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain the full blogpost body.
 * @returns The updated blogpost, or `null` if the update failed or parsing failed.
 */
export async function replaceBlogPost(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<BlogPost | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const body = parseSchema(server, ReplaceBlogPostBodySchema, request.body);
  const { admin, current_time } = getMetadata(request);

  const rows = await replaceBlogPostQuery(server)(
    body["blog"],
    body["title"],
    body["content"],
    body["published_at"],
    admin,
    current_time,
    id,
  );

  return rows[0] ?? null;
}
