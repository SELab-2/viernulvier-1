import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Tag } from "@viernulvier/shared/index.js";
import { TagSchema, stringToInt } from "@viernulvier/shared/index.js";
import { getMetadata, parseParams, parseSchema, ParseContext } from "@/routes/helpers.js";
import { z } from "zod";

const EditTagBodySchema = TagSchema.pick({
  name: true,
  tag_type: true,
  public: true,
}).partial();

export async function editTag(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Tag | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const body = parseSchema(server, EditTagBodySchema, request.body);

  const { admin, current_time } = getMetadata(request);

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

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
     RETURNING id, name, tag_type, public`,
    values,
  );

  return parseSchema(server, z.array(TagSchema), result.rows, ParseContext.Database)[0] ?? null;
}
