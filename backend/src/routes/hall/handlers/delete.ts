import type { Hall } from "@viernulvier/shared/index.js";
import { HallSchema, stringToInt } from "@viernulvier/shared/index.js";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { parseParams, buildQuery } from "@/routes/helpers.js";
import { z } from "zod";

const deleteHallById = (server: FastifyInstance) =>
  buildQuery(
    server,
    `DELETE FROM hall WHERE id = $1
     RETURNING id, old_id, name, address, vendor_id`,
    z.tuple([z.int()]),
    HallSchema,
  );

/**
 * Deletes a hall by ID and returns the deleted record.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The deleted hall, or `null` if not found or parsing failed.
 */
export async function deleteHall(server: FastifyInstance, request: FastifyRequest): Promise<Hall | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const rows = await deleteHallById(server)(id);
  return rows[0] ?? null;
}
