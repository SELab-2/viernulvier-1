import type { FastifyInstance, FastifyRequest } from "fastify";
import type { BlogPost } from "@viernulvier/shared/index.js";
import { BlogPostSchema, stringToInt } from "@viernulvier/shared/index.js";
import { getMetadata, parseParams, buildQuery, parseSchema } from "@/routes/helpers.js";
import { z } from "zod";

const ReplaceBlogPostBodySchema = BlogPostSchema.omit({ id: true }).extend({
  productions: z.array(z.int()).min(1, "Productions array must contain at least one production"),
});

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
 * Also updates the production_blogpost relations based on the provided productions array.
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
  const productions = body.productions;

  const rows = await replaceBlogPostQuery(server)(
    body["blog"],
    body["title"],
    body["content"],
    body["published_at"],
    admin,
    current_time,
    id,
  );

  const blogpost = rows[0];
  if (!blogpost) {
    return null;
  }

  // Delete existing relations and insert new ones
  try {
    await server.pg.query(
      `DELETE FROM production_blogpost WHERE blogpost = $1`,
      [id],
    );
  } catch (err) {
    server.log.error(err);
  }

  // Insert new relations
  for (const production of productions) {
    try {
      await buildQuery(
        server,
        `INSERT INTO production_blogpost (production, blogpost, created_by, updated_by, created_at, updated_at)
         VALUES ($1, $2, $3, $3, $4, $4)
         ON CONFLICT DO NOTHING`,
        z.tuple([
          z.int(),
          z.int(),
          z.int(),
          z.date(),
        ]),
        z.object({}),
      )(production, id, admin, current_time);
    } catch (err) {
      server.log.error(err);
      // Log but don't fail - continue with other productions
    }
  }

  return blogpost;
}
