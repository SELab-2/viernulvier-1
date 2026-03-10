import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Tag } from "@viernulvier/shared/index.js";
import { TagSchema } from "@viernulvier/shared/index.js";
import { getParam, parseFirstRow } from "@/routes/helpers.js";

async function fetchTag(
  server: FastifyInstance,
  request: FastifyRequest
): Promise<Tag | null> {

  const result = await server.pg.query<Tag>(
    `SELECT id, name, type
     FROM tag
     WHERE id = $1`,
    [getParam(request, "id")]
  );

  return parseFirstRow(server, TagSchema, result.rows);
}

async function fetchTags(server: FastifyInstance): Promise<Tag[]> {

  const result = await server.pg.query<Tag>(
    `SELECT id, name, type FROM tag`
  );

  return result.rows;
}

async function fetchTagsForProduction(
  server: FastifyInstance,
  request: FastifyRequest
): Promise<Tag[]> {

  const result = await server.pg.query<Tag>(
    `SELECT t.id, t.name, t.type
     FROM tag t
     JOIN tag_production tp ON tp.tag_id = t.id
     WHERE tp.production_id = $1`,
    [getParam(request, "id")]
  );

  return result.rows;
}

export { fetchTag, fetchTags, fetchTagsForProduction };