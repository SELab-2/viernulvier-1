import type { FastifyInstance, FastifyRequest } from "fastify";
import z from "zod";

import { buildQuery, parseParams } from "@/routes/helpers.js";
import { EventSchema, stringToInt } from "@viernulvier/shared/index.js";
import type { Event } from "@viernulvier/shared/index.js";

/**
 * Deletes a single event by ID from the database.
 * Returns `null` when the event does not exist or validation fails.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request containing the event route parameter.
 * @returns The parsed event, or `null` if not found or validation failed.
 */
export async function deleteEvent(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Event | null> {  
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const result = await buildQuery(server,
    `DELETE FROM event WHERE id = $1 RETURNING id, starts_at, ends_at, production, hall, doors_at, info, 
        (SELECT COALESCE(ARRAY_AGG(ep.id), '{}') FROM event_price ep WHERE ep.event = event.id) AS price`,
    z.tuple([z.int()]),
    EventSchema,
  )(id);

  return result[0]!;
}

