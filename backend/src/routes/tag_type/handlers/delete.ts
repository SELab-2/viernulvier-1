import type { FastifyInstance, FastifyRequest } from "fastify";

export async function deleteTagType(
  server: FastifyInstance,
  request: FastifyRequest
) {
  const { id } = request.params as { id: number };

  const result = await server.pg.query(
    `
    DELETE FROM tag_type
    WHERE id = $1
    RETURNING id
    `,
    [id]
  );

  return result.rows[0] ?? null;
}