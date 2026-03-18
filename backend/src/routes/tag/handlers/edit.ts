import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Tag } from "@viernulvier/shared/index.js";
import { TagSchema } from "@viernulvier/shared/index.js";
import { getMetadata, getParam, parseFirstRow, parseSchema } from "@/routes/helpers.js";

const EditTagBodySchema = TagSchema.pick({
  name: true,
  type: true,
  public: true,
}).partial();

export async function editTag(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Tag | null> {

  const id = getParam(request, "id");
  const body = parseSchema(server, EditTagBodySchema, request.body);

  const { admin, current_time } = getMetadata(request);

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (body.name !== undefined) {
    fields.push(`name = $${i++}`);
    values.push(body.name);
  }

  if (body.type !== undefined) {
    fields.push(`type_id = $${i++}`);
    values.push(body.type);
  }

  if (body.public !== undefined) {
    fields.push(`public = $${i++}`);
    values.push(body.public);
  }

  fields.push(`updated_by = $${i++}`, `updated_at = $${i++}`);
  values.push(admin, current_time, id);

  const result = await server.pg.query<Tag>(
    `UPDATE tag SET ${fields.join(", ")} WHERE id = $${i}
     RETURNING id, name, type_id, public`,
    values,
  );

  return parseFirstRow(server, TagSchema, result.rows);
}