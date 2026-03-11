import z from "zod";
import type { FastifyInstance, FastifyRequest } from "fastify";

import { buildQuery, parseParams } from "@/routes/helpers.js";
import { EventPriceSchema, stringToInt } from "@viernulvier/shared/index.js";
import type { EventPrice } from "@viernulvier/shared/index.js";

/**
 * Deletes a single event price by ID from the database.
 * Returns `null` when the event price does not exist or validation fails.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request containing the event price route parameter.
 * @returns The parsed event price, or `null` if not found or validation failed.
 */
export async function deleteEventPrice(
  server: FastifyInstance,
  request: FastifyRequest
): Promise<EventPrice | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const result = await buildQuery(server,
    `RETURNING id, event, amount
    DELETE FROM event_price WHERE id = $1`,
    z.tuple([z.int()]),
    EventPriceSchema,
  )(id);

  return result[0] ?? null;
}
