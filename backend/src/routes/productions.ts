import type { FastifyInstance } from "fastify";

export default function productionRoutes(server: FastifyInstance) {
  server.get("/api/production/:id", async (request, _reply) => {
    const { id } = request.params as { id: string };
    const result = await server.pg.query(
      "SELECT id FROM productions WHERE id=$1",
      [id],
    );

    return result.rows[0];
  });
 server.get("/api/production", async (_request, _reply) => {
   console.log("start get");
    const result = await server.pg.query(
      "SELECT id FROM productions",
    );
   console.log("end get");
    return result.rows[0];
  });
}