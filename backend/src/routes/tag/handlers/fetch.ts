import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Tag, TagWithMeta } from "@viernulvier/shared/index.js";
import { TagSchema } from "@viernulvier/shared/index.js";
import { getParam, parseFirstRow } from "@/routes/helpers.js";

async function fetchTag(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Tag | null> {

  const result = await server.pg.query<Tag>(
    `SELECT id, name, type_id, public
     FROM tag
     WHERE id = $1`,
    [getParam(request, "id")],
  );

  return parseFirstRow(server, TagSchema, result.rows);
}

async function fetchTagVisible(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Tag | null> {

  const result = await server.pg.query<Tag>(
    `SELECT id, name, type_id, public
     FROM tag
     WHERE id = $1 AND public = true`,
    [getParam(request, "id")],
  );

  return parseFirstRow(server, TagSchema, result.rows);
}



async function fetchTagWithMeta(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<TagWithMeta | null> {

  const result = await server.pg.query<TagWithMeta>(
    `SELECT id, name, type_id, public,
            created_at, updated_at,
            created_by, updated_by
     FROM tag
     WHERE id = $1`,
    [getParam(request, "id")],
  );

  return parseFirstRow(server, TagSchema.withMeta(), result.rows);
}

async function fetchTags(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Tag[]> {

  const { production } = request.query as { production?: string };


  if (production) {
    const result = await server.pg.query<Tag>(
      `SELECT t.id, t.name, t.type_id, public
       FROM tag t
       JOIN production_tag pt ON pt.tag_id = t.id
       WHERE pt.production_id = $1`,
      [production],
    );

    return result.rows;
  }

  const result = await server.pg.query<Tag>(
    `SELECT id, name, type_id, public FROM tag`,
  );

  return result.rows;
}

async function fetchTagsVisible(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Tag[]> {

  const { production } = request.query as { production?: string };


  if (production) {
    const result = await server.pg.query<Tag>(
      `SELECT t.id, t.name, t.type_id, public
       FROM tag t
       JOIN production_tag pt ON pt.tag_id = t.id
       WHERE pt.production_id = $1 AND t.public = true`,
      [production],
    );

    return result.rows;
  }

  const result = await server.pg.query<Tag>(
    `SELECT id, name, type_id, public FROM tag WHERE public = true`,
  );

  return result.rows;
}

export { fetchTag, fetchTags, fetchTagWithMeta, fetchTagVisible, fetchTagsVisible };