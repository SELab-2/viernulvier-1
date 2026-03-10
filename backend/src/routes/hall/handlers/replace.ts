import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Hall } from "@viernulvier/shared/index.js";
import { HallSchema, languageMap, stringToInt } from "@viernulvier/shared/index.js";
import { getMetadata, parseParams, buildQuery, parseSchema } from "@/routes/helpers.js";
import { z } from "zod";

const ReplaceHallBodySchema = HallSchema.omit({ id: true });

const replaceHallQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `UPDATE hall SET name = $1, address = $2, vendor_id = $3, updated_by = $4, updated_at = $5
     WHERE id = $6
     RETURNING id, name, address, vendor_id`,
    z.tuple([
      languageMap,           // name
      z.string(),            // address
      z.int().nonnegative(), // vendor_id
      z.int(),               // admin
      z.date(),              // current_time
      z.int(),               // id
    ]),
    HallSchema,
  );

/**
 * Replaces an existing hall's data and returns the updated record.
 * Unlike `editHall`, all fields are required and will be overwritten.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `name`, `address` and `vendor_id` in its body.
 * @returns The updated hall, or `null` if the update failed or parsing failed.
 */
export async function replaceHall(server: FastifyInstance, request: FastifyRequest): Promise<Hall | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const body = parseSchema(server, ReplaceHallBodySchema, request.body);
  const { admin, current_time } = getMetadata(request);

  const rows = await replaceHallQuery(server)(
    body["name"],
    body["address"],
    body["vendor_id"],
    admin,
    current_time,
    id,
  );

  return rows[0] ?? null;
}
