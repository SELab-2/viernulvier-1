import type { FastifyInstance, FastifyRequest } from "fastify";
import type { TagType } from "@viernulvier/shared/index.js";
import { TagTypeSchema, stringToInt } from "@viernulvier/shared/index.js";
import { getMetadata, parseParams, parseSchema, ParseContext } from "@/routes/helpers.js";
import { z } from "zod";

export const EditTagTypeBodySchema = TagTypeSchema.pick({
  name: true,
}).partial();

/**
 * Partially updates an existing tag type and returns the updated record.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in params and a partial body (`name`).
 * @returns The updated tag type, or `null` if the update failed or parsing failed.
 */
export async function editTagType(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<TagType | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const body = parseSchema(server, EditTagTypeBodySchema, request.body);

  const { admin, current_time } = getMetadata(request);

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (body.name !== undefined) {
    fields.push(`name = $${i++}`);
    values.push(body.name);
  }

  fields.push(`updated_by = $${i++}`, `updated_at = $${i++}`);
  values.push(admin, current_time, id);

  const result = await server.pg.query<TagType>(
    `UPDATE tag_type SET ${fields.join(", ")} WHERE id = $${i}
     RETURNING id, name`,
    values,
  );

  return parseSchema(server, z.array(TagTypeSchema), result.rows, ParseContext.Database)[0] ?? null;
}
