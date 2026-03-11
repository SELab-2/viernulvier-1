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

async function fetchTags(
  server: FastifyInstance,
  request: FastifyRequest
): Promise<Tag[]> {

  const { production } = request.query as { production?: string };

  if (production) {
    const result = await server.pg.query<Tag>(
      `SELECT t.id, t.name, t.type_id
       FROM tag t
       JOIN production_tag pt ON pt.tag_id = t.id
       WHERE pt.production_id = $1`,
      [production]
    );

    return result.rows;
  }

  const result = await server.pg.query<Tag>(
    `SELECT id, name, type_id FROM tag`
  );

  return result.rows;
}
/*
async function fetchTagsForProduction(
  server: FastifyInstance,
  request: FastifyRequest
): Promise<Tag[]> {

  const result = await server.pg.query<Tag>(
    `SELECT t.id, t.name, t.type_id
     FROM tag t
     JOIN production_tag pt ON pt.tag_id = t.id
     WHERE pt.production_id = $1`,
    [getParam(request, "id")]
  );

  return result.rows;
}*/

export { fetchTag, fetchTags, /*fetchTagsForProduction,*/};