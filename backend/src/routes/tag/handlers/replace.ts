import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Tag } from "@viernulvier/shared/index.js";
import { TagSchema } from "@viernulvier/shared/index.js";
import { getMetadata, getParam, parseFirstRow, parseSchema } from "@/routes/helpers.js";

const ReplaceTagBodySchema = TagSchema.pick({
  old_id: true,
  name: true,
  type: true,
  public: true,
});

export async function replaceTag(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Tag | null> {

  const id = getParam(request, "id");
  const body = parseSchema(server, ReplaceTagBodySchema, request.body);

  const { admin, current_time } = getMetadata(request);

  const result = await server.pg.query<Tag>(
    `UPDATE tag
     SET old_id = $1, name = $2, type_id = $3, public = $4, updated_by = $5, updated_at = $6
     WHERE id = $7
     RETURNING id, old_id, name, type_id, public`,
    [body.old_id, body.name, body.type, body.public, admin, current_time, id],
  );

  return parseFirstRow(server, TagSchema, result.rows);
}