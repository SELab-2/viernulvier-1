import type { FastifyInstance, FastifyRequest } from "fastify";
import type { TagType, TagTypeWithMeta } from "@viernulvier/shared/index.js";
import { TagTypeSchema } from "@viernulvier/shared/index.js";
import { getParam, parseFirstRow } from "@/routes/helpers.js";

async function fetchTagType(
  server: FastifyInstance,
  request: FastifyRequest
): Promise<TagType | null> {

  const result = await server.pg.query<TagType>(
    `SELECT id, name
     FROM tag_type
     WHERE id = $1`,
    [getParam(request, "id")]
  );

  return parseFirstRow(server, TagTypeSchema, result.rows);
}

async function fetchTagTypeWithMeta(
  server: FastifyInstance,
  request: FastifyRequest
): Promise<TagTypeWithMeta | null> {

  const result = await server.pg.query<TagTypeWithMeta>(
    `SELECT id, name,
            created_at, updated_at,
            created_by, updated_by
     FROM tag_type
     WHERE id = $1`,
    [getParam(request, "id")]
  );

  return parseFirstRow(server, TagTypeSchema.withMeta(), result.rows);
}

async function fetchTagTypes(server: FastifyInstance): Promise<TagType[]> {

  const result = await server.pg.query<TagType>(
    `SELECT id, name FROM tag_type`
  );

  return result.rows;
}

export { fetchTagType, fetchTagTypes, fetchTagTypeWithMeta };