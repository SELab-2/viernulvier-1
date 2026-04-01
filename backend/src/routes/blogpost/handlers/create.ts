import type { FastifyInstance, FastifyRequest } from "fastify";
import type { BlogPost } from "@viernulvier/shared/index.js";
import { BlogPostSchema } from "@viernulvier/shared/index.js";
import { getMetadata, parseSchema, buildQuery } from "@/routes/helpers.js";
import { z } from "zod";

const CreateBlogPostBodySchema = BlogPostSchema.omit({ id: true });

const insertBlogPost = (server: FastifyInstance) =>
  buildQuery(
    server,
    `INSERT INTO blogpost (blog, title, content, published_at, created_by, updated_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $5, $6, $6)
     RETURNING id, blog, title, content, published_at`,
    z.tuple([
      z.int().nonnegative(),              // blog (FK)
      z.string(),                         // title
      z.record(z.string(), z.unknown()),  // content (JSONB)
      z.coerce.date().nullable(),         // published_at
      z.int(),                            // admin
      z.date(),                           // current_time
    ]),
    BlogPostSchema,
  );

/**
 * Creates a new blogpost and returns the created blogpost.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain a blogpost body.
 * @returns The created blogpost, or `null` if the insert failed or parsing failed.
 */
export async function createBlogPost(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<BlogPost | null> {
  const body = parseSchema(server, CreateBlogPostBodySchema, request.body);
  const { admin, current_time } = getMetadata(request);

  const rows = await insertBlogPost(server)(
    body["blog"],
    body["title"],
    body["content"],
    body["published_at"],
    admin,
    current_time,
  );

  return rows[0] ?? null;
}
