import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared/index.js";
import { stringToInt } from "@viernulvier/shared/index.js";
import { parseParams } from "@/routes/helpers.js";
import { getProductionById } from "./fetch.js";
import z from "zod";

/**
 * Deletes a production by ID and returns the deleted record.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The deleted production, or `null` if not found.
 */
export async function deleteProduction(server: FastifyInstance, request: FastifyRequest): Promise<ProductionWithBackwardsRefs | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));

  const existing = await getProductionById(server, id);
  if (!existing) return null;

  await server.pg.query("DELETE FROM production WHERE id = $1", [id]);

  return existing;
}

