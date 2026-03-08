import type { FastifyInstance, FastifyRequest } from "fastify";

export async function deleteTagType(server: FastifyInstance, request: FastifyRequest) {
  const id = Number((request.params as any).id);

  await server.pg.query(
    `DELETE FROM tag_type WHERE id=$1`,
    [id],
  );

  return { success: true };
}
