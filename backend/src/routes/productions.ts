import type { FastifyInstance } from "fastify";
import {
  ProductionSchema,
  type Production,
} from "@viernulvier/shared/types/production.js";
import { buildQuery, parseParams } from "./helpers.js";
import z from "zod";
import { stringToInt } from "@viernulvier/shared/types/helpers.js";

/**
 * Defines the api requests for /api/productions
 * @alpha
 * @param server - The fastify server instance on which this request will be served
 */
export default function productionRoutes(server: FastifyInstance) {
  server.get("/api/production/:id", async (request) => {
    const { id } = parseParams(request, z.object({ id: stringToInt }));
    const result = await buildQuery(
      server,
      "SELECT id FROM productions WHERE id=$1",
      z.tuple([ProductionSchema.shape.id]),
      ProductionSchema,
    )(id);

    return result[0];
  });
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
