import type { FastifyInstance, FastifyRequest } from "fastify";

export async function deleteTag(
  server: FastifyInstance,
  request: FastifyRequest
) {
  const { id } = request.params as { id: number };

  const result = await server.pg.query(
    `DELETE FROM tag WHERE id = $1 RETURNING id`,
    [id]
  );

  return result.rows[0] ?? null;
}