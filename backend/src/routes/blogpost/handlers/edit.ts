import type { FastifyInstance, FastifyRequest } from "fastify";
import type { BlogPost } from "@viernulvier/shared/index.js";
import { BlogPostSchema, stringToInt } from "@viernulvier/shared/index.js";
import { getMetadata, parseParams, parseSchema, HttpError, HttpClientError, ParseContext } from "@/routes/helpers.js";
import { z } from "zod";

export const EditBlogPostBodySchema = BlogPostSchema.omit({ id: true }).partial();

/**
 * Updates an existing blogpost and returns the updated record.
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

  if (fields.length === 0) {
    throw new HttpError(HttpClientError.BadRequest, "No fields to update");
  }

  fields.push(`updated_by = $${i++}`, `updated_at = $${i++}`);
  values.push(admin, current_time, id);

  const result = await server.pg.query<BlogPost>(
    `UPDATE blogpost SET ${fields.join(", ")} WHERE id = $${i}
     RETURNING id, blog, title, content, published_at`,
    values,
  );

  return parseSchema(server, z.array(BlogPostSchema), result.rows, ParseContext.Database)[0] ?? null;
}
