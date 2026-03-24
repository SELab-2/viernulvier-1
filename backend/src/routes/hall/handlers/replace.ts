import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Hall } from "@viernulvier/shared/index.js";
import { HallSchema, languageMap, stringToInt } from "@viernulvier/shared/index.js";
import { getMetadata, parseParams, buildQuery, parseSchema } from "@/routes/helpers.js";
import { z } from "zod";

const ReplaceHallBodySchema = HallSchema.omit({ id: true });

const replaceHallQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `UPDATE hall SET name = $1, address = $2, updated_by = $3, updated_at = $4
     WHERE id = $5
     RETURNING id, name, address`,
    z.tuple([
      languageMap,           // name
      z.string(),            // address
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
 * @param request - The Fastify request, expected to contain `name` and `address` in its body.
 * @returns The updated hall, or `null` if the update failed or parsing failed.
 */
export async function replaceHall(server: FastifyInstance, request: FastifyRequest): Promise<Hall | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const body = parseSchema(server, ReplaceHallBodySchema, request.body);
  const { admin, current_time } = getMetadata(request);

  const rows = await replaceHallQuery(server)(
    body["name"],
    body["address"],
    admin,
    current_time,
    id,
  );

  return rows[0] ?? null;
}
