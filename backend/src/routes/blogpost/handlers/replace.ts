import type { FastifyInstance, FastifyRequest } from "fastify";
import type {
  BlogPost,
  BlogPostWithBackwardsRefs,
} from "@viernulvier/shared/index.js";
import {
  BlogPostSchema,
  BlogPostWithBackwardsRefsSchema,
  serial,
} from "@viernulvier/shared/index.js";
import {
  getMetadata,
  ParseContext,
  parseParams,
  parseSchema,
  HttpError,
  HttpServerError,
} from "@/routes/helpers.js";
import { z } from "zod";

export const ReplaceBlogPostBodySchema = BlogPostSchema.omit({
  id: true,
}).extend({
  productions: z.array(z.int()),
});

/**
 * Replaces an existing blogpost's data and returns the updated record.
 * Unlike `editBlogPost`, all fields are required and will be overwritten.
 * Also updates the production_blogpost relations based on the provided productions array.
 * All operations are wrapped in a transaction — if any part fails, the entire
 * operation is rolled back and nothing is persisted.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain the full blogpost body.
 * @returns The updated blogpost, or `null` if the update failed or parsing failed.
 */
export async function replaceBlogPost(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<BlogPostWithBackwardsRefs | null> {
  const { id } = parseParams(request, z.object({ id: serial() }));
  const body = parseSchema(server, ReplaceBlogPostBodySchema, request.body);
  const { admin, current_time } = getMetadata(request);
  const productions = body.productions;

  const client = await server.pg.connect();

  try {
    await client.query("BEGIN");

    // Update blogpost within transaction
    const result = await client.query<BlogPost>(
      `UPDATE blogpost
       SET blog = $1, title = $2, content = $3, published_at = $4, updated_by = $5, updated_at = $6
       WHERE id = $7
       RETURNING id, blog, title, content, published_at`,
      [
        body["blog"],
        body["title"],
        body["content"],
        body["published_at"],
        admin,
        current_time,
        id,
      ],
    );

    const blogpost = parseSchema(
      server,
      BlogPostSchema,
      result.rows[0],
      ParseContext.Database,
    );

    // Delete existing relations
    await client.query(`DELETE FROM production_blogpost WHERE blogpost = $1`, [
      id,
    ]);

    // Insert new relations
    for (const production of productions) {
      await client.query(
        `INSERT INTO production_blogpost (production, blogpost, created_by, updated_by, created_at, updated_at)
         VALUES ($1, $2, $3, $3, $4, $4)
         ON CONFLICT DO NOTHING`,
        [production, id, admin, current_time],
      );
    }

    // Fetch production IDs for the replaced blogpost
    const productionsResult = await client.query<{ production: number }>(
      `SELECT production FROM production_blogpost WHERE blogpost = $1`,
      [id],
    );
    const productionIds = productionsResult.rows.map((row) => row.production);

    await client.query("COMMIT");
    return parseSchema(
      server,
      BlogPostWithBackwardsRefsSchema,
      { ...blogpost, productions: productionIds },
      ParseContext.Database,
    );
  } catch (err) {
    await client.query("ROLLBACK");
    server.log.error(err);
    throw new HttpError(
      HttpServerError.InternalServerError,
      "Internal server error",
    );
  } finally {
    client.release();
  }
}
