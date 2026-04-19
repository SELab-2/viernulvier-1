import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Hall } from "@viernulvier/shared/index.js";
import { HallSchema, languageMap, stringToInt } from "@viernulvier/shared/index.js";
import { getMetadata, parseParams, buildQuery, parseSchema } from "@/routes/helpers.js";
import { z } from "zod";

export const ReplaceHallBodySchema = HallSchema.omit({ id: true });

const replaceHallQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `UPDATE hall SET old_id = $1, name = $2, address = $3, updated_by = $4, updated_at = $5
     WHERE id = $6
     RETURNING id, old_id, name, address`,
    z.tuple([
      z.int().nonnegative().nullable(),
      languageMap,
      z.string().nullable(),
      z.int(),
      z.date(),
      z.int(),
    ]),
    HallSchema,
  );

/**
 * Replaces an existing hall's data and returns the updated record.
 * Unlike `editHall`, all fields are required and will be overwritten.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `name` and `address` in its body.
 * @returns The updated hall, or `null` if the update failed or parsing failed.
 */
export async function replaceHall(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Hall | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const body = parseSchema(server, ReplaceHallBodySchema, request.body);
  const { admin, current_time } = getMetadata(request);

  const rows = await replaceHallQuery(server)(
    body["old_id"],
    body["name"],
    body["address"],
    admin,
    current_time,
    id,
  );

  return rows[0] ?? null;
}
