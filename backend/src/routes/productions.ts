import type { FastifyInstance } from "fastify";

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.get("/api/production/:id", async (request, _reply) => {
    const { id } = request.params as { id: string };

    const result = await fastify.pg.query(
      "SELECT id FROM productions WHERE id=$1",
      [id],
    );

    return result.rows[0];
  });
 fastify.get("/api/production", async (_request, _reply) => {

    const result = await fastify.pg.query(
      "SELECT id FROM productions",
    );

    return result.rows[0];
  });
}