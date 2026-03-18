import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Tag } from "@viernulvier/shared/index.js";
import { TagSchema } from "@viernulvier/shared/index.js";
import { getMetadata, getParam, parseFirstRow, parseSchema } from "@/routes/helpers.js";

const ReplaceTagBodySchema = TagSchema.pick({
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
     SET name = $1, type_id = $2, public = $3, updated_by = $4, updated_at = $5
     WHERE id = $6
     RETURNING id, name, type_id, public`,
    [body.name, body.type, body.public, admin, current_time, id],
  );

  return parseFirstRow(server, TagSchema, result.rows);
}