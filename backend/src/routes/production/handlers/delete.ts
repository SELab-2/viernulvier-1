import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Production } from "@viernulvier/shared/index.js";
import { getParam } from "@/routes/helpers.js";
import { getProductionById } from "./fetch.js";

/**
 * Deletes a production by ID and returns the deleted record.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The deleted production, or `null` if not found.
 */
export async function deleteProduction(server: FastifyInstance, request: FastifyRequest): Promise<Production | null> {
  const id = getParam(request, "id");

  const existing = await getProductionById(server, id);
  if (!existing) return null;

  await server.pg.query("DELETE FROM production WHERE id = $1", [id]);

  return existing;
}

