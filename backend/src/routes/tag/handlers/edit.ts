import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Tag } from "@viernulvier/shared/index.js";
import { TagSchema, serial } from "@viernulvier/shared/index.js";
import { getMetadata, parseParams, parseSchema, ParseContext } from "@/routes/helpers.js";
import { z } from "zod";

export const EditTagBodySchema = TagSchema.pick({
  old_id: true,
  name: true,
  tag_type: true,
  public: true,
}).partial();

/**
 * Partially updates an existing tag and returns the updated record.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in params and a partial tag body.
 * @returns The updated tag, or `null` if the update failed or parsing failed.
 */
export async function editTag(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Tag | null> {
  const { id } = parseParams(request, z.object({ id: serial() }));
  const body = parseSchema(server, EditTagBodySchema, request.body);

  const { admin, current_time } = getMetadata(request);

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (body.old_id !== undefined) {
    fields.push(`old_id = $${i++}`);
    values.push(body.old_id);
  }

  if (body.name !== undefined) {
    fields.push(`name = $${i++}`);
    values.push(body.name);
  }

  if (body.tag_type !== undefined) {
    fields.push(`tag_type = $${i++}`);
    values.push(body.tag_type);
  }

  if (body.public !== undefined) {
    fields.push(`public = $${i++}`);
    values.push(body.public);
  }


  fields.push(`updated_by = $${i++}`, `updated_at = $${i++}`);
  values.push(admin, current_time, id);

  const result = await server.pg.query<Tag>(
    `UPDATE tag SET ${fields.join(", ")} WHERE id = $${i}
     RETURNING id, old_id, name, tag_type, public`,
    values,
  );

  return parseSchema(server, z.array(TagSchema), result.rows, ParseContext.Database)[0] ?? null;
}
