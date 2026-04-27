import type { FastifyInstance, FastifyRequest } from "fastify";
import type { BlogPost } from "@viernulvier/shared/index.js";
import { BlogPostSchema } from "@viernulvier/shared/index.js";
import { getMetadata, parseSchema, buildQuery } from "@/routes/helpers.js";
import { z } from "zod";

const CreateBlogPostInputSchema = BlogPostSchema.omit({ id: true }).extend({
  productions: z.array(z.int()).min(1, "Productions array must contain at least one production"),
});

const insertBlogPost = (server: FastifyInstance) =>
  buildQuery(
    server,
    `INSERT INTO blogpost (blog, title, content, published_at, created_by, updated_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $5, $6, $6)
     RETURNING id, blog, title, content, published_at`,
    z.tuple([
      CreateBlogPostInputSchema.shape.blog,
      CreateBlogPostInputSchema.shape.title,
      CreateBlogPostInputSchema.shape.content,
      CreateBlogPostInputSchema.shape.published_at,
      z.int(),
      z.date(),
    ]),
    BlogPostSchema,
  );

/**
 * Creates a new blogpost and returns the created blogpost.
 * Also creates production_blogpost relations for each production ID in the input.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain a blogpost body with productions array.
 * @returns The created blogpost, or `null` if the insert failed or parsing failed.
 */
export async function createBlogPost(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<BlogPost | null> {
  const body = parseSchema(server, CreateBlogPostInputSchema, request.body);
  const { admin, current_time } = getMetadata(request);
  const productions = body.productions;

  const rows = await insertBlogPost(server)(
    body["blog"],
    body["title"],
    body["content"],
    body["published_at"],
    admin,
    current_time,
  );

  const blogpost = rows[0];
  if (!blogpost) {
    return null;
  }

  // Insert production_blogpost relations for each production
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
      )(production, blogpost.id, admin, current_time);
    } catch (err) {
      server.log.error(err);
      // Log but don't fail - continue with other productions
    }
  }

  return blogpost;
}
