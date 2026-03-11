import type { FastifyInstance, FastifyRequest } from "fastify";
import type { TagType } from "@viernulvier/shared/index.js";
import { TagTypeSchema } from "@viernulvier/shared/index.js";
import { getParam, parseFirstRow } from "@/routes/helpers.js";

export async function deleteTagType(
  server: FastifyInstance,
  request: FastifyRequest
): Promise<TagType | null> {

  const result = await server.pg.query<TagType>(
    `DELETE FROM tag_type
     WHERE id = $1
     RETURNING id, name`,
    [getParam(request, "id")]
  );

  return parseFirstRow(server, TagTypeSchema, result.rows);
}