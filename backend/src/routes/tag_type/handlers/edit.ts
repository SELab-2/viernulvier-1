import type { FastifyInstance, FastifyRequest } from "fastify";
import type { TagType } from "@viernulvier/shared/index.js";
import { TagTypeSchema, stringToInt } from "@viernulvier/shared/index.js";
import { getMetadata, parseParams, parseSchema, ParseContext } from "@/routes/helpers.js";
import { z } from "zod";

const EditTagTypeBodySchema = TagTypeSchema.pick({
  name: true,
}).partial();

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
