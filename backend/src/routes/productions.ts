import type { FastifyInstance } from "fastify";
import {
  ProductionSchema,
  type Production,
} from "@viernulvier/shared/types/production.js";

/**
 * Defines the api requests for /api/productions
 * @alpha
 * @param server - The fastify server instance on which this request will be served
 */

export default function productionRoutes(server: FastifyInstance) {
  /**
   * @param id - the id of the production
   * @returns a production
   */
  server.get(
    "/api/production/:id",
    {
      schema: {
        description: "Get a Production by id",
        params: ProductionSchema.pick({ id: true }),
        response: {
          200: ProductionSchema,
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const result = await server.pg.query<Production>(
        "SELECT id FROM productions WHERE id=$1",
        [id],
      );
      return result.rows[0];
    },
  );
  server.get("/api/production", async () => {
    const result = await server.pg.query<Production>(
      "SELECT id FROM productions",
    );

    return result.rows;
  });
}
