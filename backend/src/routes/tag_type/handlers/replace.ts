import type { FastifyInstance, FastifyRequest } from "fastify";
import type { TagType } from "@viernulvier/shared/index.js";
import { TagTypeSchema } from "@viernulvier/shared/index.js";
import { getMetadata, getParam, parseFirstRow, parseSchema } from "@/routes/helpers.js";

const ReplaceTagTypeBodySchema = TagTypeSchema.pick({
  name: true,

});

export async function replaceTagType(
  server: FastifyInstance,
  request: FastifyRequest
): Promise<TagType | null> {

  const id = getParam(request, "id");
  const body = parseSchema(server, ReplaceTagTypeBodySchema, request.body);

  const { admin, current_time } = getMetadata(request);

  const result = await server.pg.query<TagType>(
    `UPDATE tag_type
     SET name = $1, updated_by = $2, updated_at = $3
     WHERE id = $4
     RETURNING id, name`,
    [body.name, admin, current_time, id]
  );

  return parseFirstRow(server, TagTypeSchema, result.rows);
}