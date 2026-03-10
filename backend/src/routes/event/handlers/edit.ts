import type { FastifyInstance, FastifyRequest } from "fastify";

import { getParam, parse, parseFirstRow, ParseContext, getMetadata } from "@/routes/helpers.js";
import { EventSchema } from "@viernulvier/shared/types/event.js";
import type { Event } from "@viernulvier/shared/types/event.js";
import { fetchEvent } from "./fetch.js";
import { normalizePartialEventDates } from "./helper.js";

const EventUpdateSchema = EventSchema.partial();

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
    const body = parse<Event>(server, EventUpdateSchema, normalizedBody, ParseContext.Request);
    const selectedEvent = await fetchEvent(server, request);

    if (!selectedEvent) return null;

    const { admin, current_time } = getMetadata(request);

    const updatedEvent: Event = {
        starts_at: body.starts_at ?? selectedEvent.starts_at,
        ends_at: body.ends_at ?? selectedEvent.ends_at,
        production: body.production ?? selectedEvent.production,
        hall: body.hall ?? selectedEvent.hall,
        doors_at: body.doors_at ?? selectedEvent.doors_at,
        vendor_id: body.vendor_id ?? selectedEvent.vendor_id,
        info: body.info ?? selectedEvent.info,
        price: body.price ?? selectedEvent.price,
    };

    const result = await server.pg.query<Event>(
        `UPDATE events
         SET starts_at = $1, ends_at = $2, production = $3, hall = $4, doors_at = $5, vendor_id = $6, info = $7, price = $8, updated_by = $9, updated_at = $10
         WHERE id = $11
         RETURNING id, starts_at, ends_at, production, hall, doors_at, vendor_id, info, price`,
        [
            updatedEvent.starts_at,
            updatedEvent.ends_at,
            updatedEvent.production,
            updatedEvent.hall,
            updatedEvent.doors_at,
            updatedEvent.vendor_id,
            updatedEvent.info,
            updatedEvent.price,
            admin,
            current_time,
            getParam(request, "id"),
        ],
    );

    return parseFirstRow(server, EventSchema, result.rows);
}