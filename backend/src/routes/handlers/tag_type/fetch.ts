import type { FastifyInstance, FastifyRequest } from "fastify";
import type { TagType } from "@viernulvier/shared/index.js";

export async function fetchTagTypes(server: FastifyInstance): Promise<TagType[]> {
  const result = await server.pg.query(
    `SELECT id,name FROM tag_type ORDER BY id`,
  );

  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    visible: true,
  }));
}

export async function fetchTagType(server: FastifyInstance, request: FastifyRequest) {
  const id = Number((request.params as any).id);

  const result = await server.pg.query(
    `SELECT id,name FROM tag_type WHERE id=$1`,
    [id],
  );

  return result.rows[0] ?? null;
}
