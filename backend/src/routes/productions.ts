import type { FastifyInstance } from "fastify";
import { ProductionSchema } from "@viernulvier/shared/types/production.js";
import { buildQuery, parseParams } from "./helpers.js";
import z from "zod";
import { stringToInt } from "@viernulvier/shared/types/helpers.js";

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
      const { id } = parseParams(request, z.object({ id: stringToInt }));
      const result = await buildQuery(
        server,
        "SELECT id FROM productions WHERE id=$1",
        z.tuple([ProductionSchema.shape.id]),
        ProductionSchema.pick({ id: true }),
      )(id);
      return result[0];
    },
  );
  server.get("/api/production", async () => {
    const result = await buildQuery(
      server,
      "SELECT id FROM productions",
      z.tuple([]),
      ProductionSchema.pick({ id: true }),
    )();

    return result;
  });
}
