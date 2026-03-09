import type { FastifyInstance, FastifyRequest } from "fastify";
import type { TagType } from "@viernulvier/shared/index.js";

export async function getTagTypeById(
  server: FastifyInstance,
  id: number
): Promise<TagType | null> {

  const result = await server.pg.query<TagType>(
    `
    SELECT id, name, visible
    FROM tag_type
    WHERE id = $1
    `,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function fetchTagType(
  server: FastifyInstance,
  request: FastifyRequest
) {
  const { id } = request.params as { id: number };

  const result = await server.pg.query(
    `
    SELECT id, name
    FROM tag_type
    WHERE id = $1
    `,
    [id]
  );

  return result.rows[0] ?? null;
}