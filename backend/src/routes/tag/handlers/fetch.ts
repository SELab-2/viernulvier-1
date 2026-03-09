import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Tag } from "@viernulvier/shared/index.js";

export async function getTagById(
  server: FastifyInstance,
  id: number
): Promise<Tag | null> {

  const result = await server.pg.query<Tag>(
    `
    SELECT
      t.id,
      t.name,
      json_build_object(
        'id', tt.id,
        'name', tt.name,
        'visible', tt.visible
      ) as type,
      COALESCE(
        json_agg(pt.production_id) FILTER (WHERE pt.production_id IS NOT NULL),
        '[]'
      ) as productions
    FROM tag t
    JOIN tag_type tt ON tt.id = t.type_id
    LEFT JOIN production_tag pt ON pt.tag_id = t.id
    WHERE t.id = $1
    GROUP BY t.id, tt.id
    `,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function fetchTag(
  server: FastifyInstance,
  request: FastifyRequest<{ Params: { id: number } }>
) {
  return getTagById(server, request.params.id);
}

export async function fetchTags(server: FastifyInstance) {

  const result = await server.pg.query<Tag>(
    `
    SELECT
      t.id,
      t.name,
      json_build_object(
        'id', tt.id,
        'name', tt.name,
        'visible', tt.visible
      ) as type,
      '[]'::json as productions
    FROM tag t
    JOIN tag_type tt ON tt.id = t.type_id
    `
  );

  return result.rows;
}

export async function fetchTagsForProduction(
  server: FastifyInstance,
  request: FastifyRequest<{ Params: { productionId: number } }>
) {

  const result = await server.pg.query<Tag>(
    `
    SELECT
      t.id,
      t.name,
      json_build_object(
        'id', tt.id,
        'name', tt.name,
        'visible', tt.visible
      ) as type,
      '[]'::json as productions
    FROM production_tag pt
    JOIN tag t ON t.id = pt.tag_id
    JOIN tag_type tt ON tt.id = t.type_id
    WHERE pt.production_id = $1
    `,
    [request.params.productionId]
  );

  return result.rows;
}