import type { FastifyInstance, FastifyRequest } from "fastify";

import { getParam, parseFirstRow } from "@/routes/helpers.js";
import { EventSchema } from "@viernulvier/shared/index.js";
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
    request: FastifyRequest
): Promise<Event | null> {  
    const result = await server.pg.query<Event>(
        `DELETE FROM events WHERE id = $1 RETURNING id, starts_at, ends_at, production_id, hall, doors_at, vendor_id, info, 
            (SELECT COALESCE(ARRAY_AGG(ep.id), '{}') FROM event_prices ep WHERE ep.event = events.id) AS price`,
        [getParam(request, "id")]
    );

    return parseFirstRow(server, EventSchema, result.rows);
}