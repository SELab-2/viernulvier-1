import type { FastifyInstance, FastifyRequest } from "fastify";

import { getParam, parse, parseFirstRow, ParseContext, getMetadata } from "@/routes/helpers.js";
import { EventSchema } from "@viernulvier/shared/types/event.js";
import type { Event } from "@viernulvier/shared/types/event.js";
import { fetchEvent } from "./fetch.js";
import { normalizePartialEventDates, EventCreateSchema } from "./helper.js";
import type { EventCreate } from "./helper.js";

const EventUpdateSchema = EventCreateSchema.partial();

/**
 * Updates certain fields from a single event by ID in the database.
 * Returns `null` when the event does not exist or validation fails.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request containing the event route parameter and updated data.
 * @returns The parsed event, or `null` if not found or validation failed.
 */
export async function editEvent(
    server: FastifyInstance,
    request: FastifyRequest
): Promise<Event | null> {
    const normalizedBody = normalizePartialEventDates(request.body);
    const body = parse<EventCreate>(server, EventUpdateSchema, normalizedBody, ParseContext.Request);
    const selectedEvent = await fetchEvent(server, request);

    if (!selectedEvent) return null;

    const updatedEvent: Event = {
        starts_at: body.starts_at ?? selectedEvent.starts_at,
        ends_at: body.ends_at ?? selectedEvent.ends_at,
        production: body.production ?? selectedEvent.production,
        hall: body.hall ?? selectedEvent.hall,
        doors_at: body.doors_at ?? selectedEvent.doors_at,
        vendor_id: body.vendor_id ?? selectedEvent.vendor_id,
        info: body.info ?? selectedEvent.info,
    };

    const { current_time, admin } = getMetadata(request);

    const result = await server.pg.query<Event>(
        `UPDATE events
         SET starts_at = $1, ends_at = $2, production = $3, hall = $4, doors_at = $5, vendor_id = $6, info = $7,
            updated_at = $8, updated_by = $9
         WHERE id = $10
         RETURNING id, starts_at, ends_at, production, hall, doors_at, vendor_id, info, 
            (SELECT COALESCE(ARRAY_AGG(ep.id), '{}') FROM event_prices ep WHERE ep.event = events.id) AS price`,
        [
            updatedEvent.starts_at,
            updatedEvent.ends_at,
            updatedEvent.production,
            updatedEvent.hall,
            updatedEvent.doors_at,
            updatedEvent.vendor_id,
            updatedEvent.info,
            current_time,
            admin,
            getParam(request, "id"),
        ],
    );

    return parseFirstRow(server, EventSchema, result.rows);
}