import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Tag } from "@viernulvier/shared/index.js";
import { TagSchema } from "@viernulvier/shared/index.js";
import { getParam, parseFirstRow } from "@/routes/helpers.js";

async function fetchTag(
  server: FastifyInstance,
  request: FastifyRequest
): Promise<Tag | null> {

  const result = await server.pg.query<Tag>(
    `SELECT id, name, type_id
     FROM tag
     WHERE id = $1`,
    [getParam(request, "id")]
  );

  return parseFirstRow(server, TagSchema, result.rows);
}

async function fetchTags(server: FastifyInstance): Promise<Tag[]> {

  const result = await server.pg.query<Tag>(
    `SELECT id, name, type_id FROM tag`
  );

  return result.rows;
}

async function fetchTagsForProduction(
  server: FastifyInstance,
  request: FastifyRequest
): Promise<Tag[]> {

  const result = await server.pg.query<Tag>(
    `SELECT COALESCE(ARRAY_AGG(pt.production_id), '{}') AS productions
      FROM production_tag pt
      WHERE pt.tag_id = $1`,
    [getParam(request, "id")]
  );

  return result.rows;
}

export { fetchTag, fetchTags, fetchTagsForProduction };