import type { Hall } from "@viernulvier/shared/index.js";
import { HallSchema } from "@viernulvier/shared/index.js";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { parseParams, parseFirstRow } from "@/routes/helpers.js";
import { z } from "zod";

/**
 * Deletes a hall by ID and returns the deleted record.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The deleted hall, or `null` if not found or parsing failed.
 */
export async function deleteHall(server: FastifyInstance, request: FastifyRequest): Promise<Hall | null> {
  const { id } = parseParams(request, z.object({ 
    id: z.coerce.number() 
  }));

  const result = await server.pg.query<Hall>(
    `DELETE FROM hall WHERE id = $1
     RETURNING id, name, address, vendor_id`,
    [id]
  );

  return parseFirstRow(server, HallSchema, result.rows);
}
