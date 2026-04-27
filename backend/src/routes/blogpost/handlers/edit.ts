import type { FastifyInstance, FastifyRequest } from "fastify";
import type { BlogPost } from "@viernulvier/shared/index.js";
import { BlogPostSchema, stringToInt } from "@viernulvier/shared/index.js";
import { getMetadata, parseParams, parseSchema, HttpError, HttpClientError, ParseContext, buildQuery } from "@/routes/helpers.js";
import { z } from "zod";

const EditBlogPostBodySchema = BlogPostSchema.omit({ id: true }).partial().extend({
  productions: z.array(z.int()).min(1, "Productions array must contain at least one production").optional(),
});

/**
 * Updates an existing blogpost and returns the updated record.
 * If productions array is provided, updates the production_blogpost relations.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in params and a partial blogpost body.
 * @returns The updated blogpost, or `null` if the update failed or parsing failed.
 */
export async function editBlogPost(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<BlogPost | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const body = parseSchema(server, EditBlogPostBodySchema, request.body);
  const { admin, current_time } = getMetadata(request);
  const productions = body.productions;

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const addField = (column: string, value: unknown) => {
    if (value === undefined) return;
    fields.push(`${column} = $${i++}`);
    values.push(value);
  };

  addField("blog", body["blog"]);
  addField("title", body["title"]);
  addField("content", body["content"]);
  addField("published_at", body["published_at"]);

  if (fields.length === 0 && productions === undefined) {
    throw new HttpError(HttpClientError.BadRequest, "No fields to update");
  }

  fields.push(`updated_by = $${i++}`, `updated_at = $${i++}`);
  values.push(admin, current_time, id);

  const result = await server.pg.query<BlogPost>(
    `UPDATE blogpost SET ${fields.join(", ")} WHERE id = $${i}
     RETURNING id, blog, title, content, published_at`,
    values,
  );

  const blogpost = parseSchema(server, z.array(BlogPostSchema), result.rows, ParseContext.Database)[0];
  if (!blogpost) {
    return null;
  }

  // Update production_blogpost relations if productions array is provided
  if (productions !== undefined) {
    // Delete existing relations
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
  }

  return blogpost;
}
