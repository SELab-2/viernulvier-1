import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Tag } from "@viernulvier/shared/index.js";
import { TagSchema } from "@viernulvier/shared/index.js";
import { getParam, parseFirstRow } from "@/routes/helpers.js";

export async function deleteTag(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Tag | null> {

  const result = await server.pg.query<Tag>(
    `DELETE FROM tag
     WHERE id = $1
     RETURNING id, old_id, name, type_id, public`,
    [getParam(request, "id")],
  );

  return parseFirstRow(server, TagSchema, result.rows);
}