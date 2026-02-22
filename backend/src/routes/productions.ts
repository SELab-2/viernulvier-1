import type { FastifyInstance } from "fastify";
import type { Production } from "@shared/types/production.js"

export default function productionRoutes(server: FastifyInstance) {
  server.get("/api/production/:id", async (request, _reply) => {
    const { id } = request.params as { id: string };
    const result = await server.pg.query<Production>(
      "SELECT id FROM productions WHERE id=$1",
      [id],
    );

    return result.rows[0];
  });
 server.get("/api/production", async (_request, _reply) => {

   const result = await server.pg.query<Production>(
      "SELECT id FROM productions",
    );

    return result.rows;
  });
}