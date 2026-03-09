import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Hall } from "@viernulvier/shared/index.js";
import { HallSchema } from "@viernulvier/shared/index.js";
import { getMetadata, parseParams, parseFirstRow, parseSchema } from "@/routes/helpers.js";
import { z } from "zod";

const ReplaceHallBodySchema = HallSchema.omit({ id: true });

/**
 * Replaces an existing hall's data and returns the updated record.
 * Unlike `editHall`, all fields are required and will be overwritten.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `name`, `address` and `vendor_id` in its body.
 * @returns The updated hall, or `null` if the update failed or parsing failed.
 */
export async function replaceHall(server: FastifyInstance, request: FastifyRequest): Promise<Hall | null> {
  const { id } = parseParams(request, z.object({ 
    id: z.coerce.number() 
  }));
  const body = parseSchema(server, ReplaceHallBodySchema, request.body);
  const { admin, current_time } = getMetadata(request);

  const result = await server.pg.query<Hall>(
    `UPDATE hall SET name = $1, address = $2, vendor_id = $3, updated_by = $4, updated_at = $5
     WHERE id = $6
     RETURNING id, name, address, vendor_id`,
    [body["name"], body["address"], body["vendor_id"], admin, current_time, id]
  );

  return parseFirstRow(server, HallSchema, result.rows);
}
