import type { FastifyInstance } from "fastify";
import type { Production } from "@viernulvier/shared/types/production.js";

/**
 * Defines the api requests for /api/productions
 * @alpha
 * @param server - The fastify server instance on which this request will be served
 */

export default function productionRoutes(server: FastifyInstance) {
  server.get("/api/production/:id", async (request) => {
    const { id } = request.params as { id: string };
    const result = await server.pg.query<Production>(
      "SELECT id FROM productions WHERE id=$1",
      [id],
    );

    return result.rows[0];
  });
  server.get("/api/production", async () => {
    const result = await server.pg.query<Production>(
      "SELECT id FROM productions",
    );

    return result.rows;
  });
}
