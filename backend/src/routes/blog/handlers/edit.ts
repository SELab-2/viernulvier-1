import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Blog } from "@viernulvier/shared/index.js";
import { BlogSchema, stringToInt } from "@viernulvier/shared/index.js";
import { getMetadata, parseParams, parseSchema, HttpError, HttpClientError, ParseContext } from "@/routes/helpers.js";
import { z } from "zod";

export const EditBlogBodySchema = BlogSchema.omit({ id: true }).partial();

/**
 * Updates an existing blog and returns the updated record.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in params and a partial blog body.
 * @returns The updated blog, or `null` if the update failed or parsing failed.
 */
export async function editBlog(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Blog | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const body = parseSchema(server, EditBlogBodySchema, request.body);
  const { admin, current_time } = getMetadata(request);

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const addField = (column: string, value: unknown) => {
    if (value === undefined) return;
    fields.push(`${column} = $${i++}`);
    values.push(value);
  };

  addField("name", body["name"]);
  addField("description", body["description"]);

  if (fields.length === 0) {
    throw new HttpError(HttpClientError.BadRequest, "No fields to update");
  }

  fields.push(`updated_by = $${i++}`, `updated_at = $${i++}`);
  values.push(admin, current_time, id);

  const result = await server.pg.query<Blog>(
    `UPDATE blog SET ${fields.join(", ")} WHERE id = $${i}
     RETURNING id, name, description`,
    values,
  );

  return parseSchema(server, z.array(BlogSchema), result.rows, ParseContext.Database)[0] ?? null;
}
