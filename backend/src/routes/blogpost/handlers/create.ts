import type { FastifyInstance, FastifyRequest } from "fastify";
import type { BlogPostWithBackwardsRefs } from "@viernulvier/shared/index.js";
import { BlogPostSchema, BlogPostWithBackwardsRefsSchema } from "@viernulvier/shared/index.js";
import { getMetadata, ParseContext, parseSchema, HttpError, HttpServerError } from "@/routes/helpers.js";
import { z } from "zod";


const CreateBlogPostInputSchema = BlogPostSchema.omit({ id: true }).extend({
  productions: z.array(z.int()).min(1, "Productions array must contain at least one production"),
});

/**
 * Creates a new blogpost and returns the created blogpost.
 * Also creates production_blogpost relations for each production ID in the input.
 * All operations are wrapped in a transaction — if any part fails, the entire
 * operation is rolled back and nothing is inserted.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain a blogpost body with productions array.
 * @returns The created blogpost, or `null` if the insert failed or parsing failed.
 */
export async function createBlogPost(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<BlogPostWithBackwardsRefs | null> {
  const body = parseSchema(server, CreateBlogPostInputSchema, request.body);
  const { admin, current_time } = getMetadata(request);
  const productions = body.productions;

  const client = await server.pg.connect();

  try {
    await client.query("BEGIN");

    // Insert blogpost within transaction
    const blogpostResult = await client.query(
      `INSERT INTO blogpost (blog, title, content, published_at, created_by, updated_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $5, $6, $6)
       RETURNING id, blog, title, content, published_at`,
      [body["blog"], body["title"], body["content"], body["published_at"], admin, current_time],
    );

    const blogpost = parseSchema(server, BlogPostSchema, blogpostResult.rows[0], ParseContext.Database);

    // Insert all production_blogpost relations within same transaction
    for (const production of productions) {
      await client.query(
        `INSERT INTO production_blogpost (production, blogpost, created_by, updated_by, created_at, updated_at)
         VALUES ($1, $2, $3, $3, $4, $4)
         ON CONFLICT DO NOTHING`,
        [production, blogpost.id, admin, current_time],
      );
    }

    // Fetch production IDs for the created blogpost
    const productionsResult = await client.query<{ production: number }>(
      `SELECT production FROM production_blogpost WHERE blogpost = $1`,
      [blogpost.id],
    );
    const productionIds = productionsResult.rows.map((row) => row.production);

    await client.query("COMMIT");
    return parseSchema(server, BlogPostWithBackwardsRefsSchema, { ...blogpost, productions: productionIds }, ParseContext.Database);
  } catch (err) {
    await client.query("ROLLBACK");
    server.log.error(err);
    throw new HttpError(HttpServerError.InternalServerError, "Internal server error");
  } finally {
    client.release();
  }
}
