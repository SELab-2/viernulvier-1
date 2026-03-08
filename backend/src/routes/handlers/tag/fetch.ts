import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Tag } from "@viernulvier/shared/index.js";

export async function getTagById(server: FastifyInstance, id: number): Promise<Tag | null> {
  const tagResult = await server.pg.query(
    `SELECT id,name,type_id FROM tag WHERE id=$1`,
    [id],
  );

  const tag = tagResult.rows[0];
  if (!tag) return null;

  const prodResult = await server.pg.query(
    `SELECT production_id FROM production_tag WHERE tag_id=$1`,
    [id],
  );

  return {
    id: tag.id,
    name: tag.name,
    type: tag.type_id,
    productions: prodResult.rows.map((r) => r.production_id),
  };
}

export async function fetchTag(server: FastifyInstance, request: FastifyRequest) {
  const id = Number((request.params as any).id);
  return getTagById(server, id);
}

export async function fetchTags(server: FastifyInstance): Promise<Tag[]> {
  const result = await server.pg.query(
    `SELECT id,name,type_id FROM tag ORDER BY id`,
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type_id,
    productions: [],
  }));
}
