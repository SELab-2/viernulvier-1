import type { FastifyInstance, FastifyRequest } from "fastify";
import type { TagType } from "@viernulvier/shared/index.js";
import { TagTypeSchema } from "@viernulvier/shared/index.js";
import { getParam, parseFirstRow } from "@/routes/helpers.js";

async function fetchTagType(
  server: FastifyInstance,
  request: FastifyRequest
): Promise<TagType | null> {

  const result = await server.pg.query<TagType>(
    `SELECT id, name, visible
     FROM tag_type
     WHERE id = $1`,
    [getParam(request, "id")]
  );

  return parseFirstRow(server, TagTypeSchema, result.rows);
}

async function fetchTagTypes(server: FastifyInstance): Promise<TagType[]> {

  const result = await server.pg.query<TagType>(
    `SELECT id, name, visible FROM tag_type`
  );

  return result.rows;
}

export { fetchTagType, fetchTagTypes };