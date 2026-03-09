import type { FastifyInstance, FastifyRequest } from "fastify";

import { parse, ParseContext } from "@/routes/helpers.js";
import { EventSchema } from "@viernulvier/shared/types/event.js";
import type { Event } from "@viernulvier/shared/types/event.js";
import { fetchEvent } from "./fetch.js";
import { normalizePartialEventDates } from "./helper.js";

const EventBulkUpdateSchema = EventSchema.partial().extend({
    ids: EventSchema.shape.id.array(),
});

interface EventBulkUpdate {
    ids: string[];
    starts_at?: unknown;
    ends_at?: unknown;
    production_id?: unknown;
    hall?: unknown;
    doors_at?: unknown;
    vendor_id?: unknown;
    info?: unknown;
    price?: unknown;
}

/**
 * Updates certain fields from multiple events by ID in the database.
 * Returns `null` when the event does not exist or validation fails.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request containing the event route parameter and updated data.
 * @returns The parsed updated events, or `null` if not found or validation failed.
 */
export async function editEvents(
    server: FastifyInstance,
    request: FastifyRequest
): Promise<Event[] | null> {
    const normalizedBody = normalizePartialEventDates(request.body);
    const body = parse<EventBulkUpdate>(server, EventBulkUpdateSchema, normalizedBody, ParseContext.Request);
    const selectedEvents = await Promise.all(
        body.ids.map((id: string) => fetchEvent(
            server,
            { ...request, params: { ...(request.params as Record<string, string>), id } }
        ))
    );

    if (!selectedEvents.length || selectedEvents.some((event: Event | null) => !event)) return null;
    const existingEvents = selectedEvents as Event[];

    const updatedEvents = existingEvents.map((selectedEvent: Event) => ({
        starts_at: body.starts_at ?? (selectedEvent as unknown as Record<string, unknown>)["starts_at"],
        ends_at: body.ends_at ?? (selectedEvent as unknown as Record<string, unknown>)["ends_at"],
        production_id: body.production_id ?? (selectedEvent as unknown as Record<string, unknown>)["production_id"],
        hall: body.hall ?? (selectedEvent as unknown as Record<string, unknown>)["hall"],
        doors_at: body.doors_at ?? (selectedEvent as unknown as Record<string, unknown>)["doors_at"],
        vendor_id: body.vendor_id ?? (selectedEvent as unknown as Record<string, unknown>)["vendor_id"],
        info: body.info ?? (selectedEvent as unknown as Record<string, unknown>)["info"],
        price: body.price ?? (selectedEvent as unknown as Record<string, unknown>)["price"],
    }));

    const results = await Promise.all(
        updatedEvents.map((updatedEvent, index) => server.pg.query<Event>(
            `UPDATE events
             SET starts_at = $1, ends_at = $2, production_id = $3, hall = $4, doors_at = $5, vendor_id = $6, info = $7, price = $8
             WHERE id = $9
             RETURNING id, starts_at, ends_at, production_id, hall, doors_at, vendor_id, info, price`,
            [
                updatedEvent.starts_at,
                updatedEvent.ends_at,
                updatedEvent.production_id,
                updatedEvent.hall,
                updatedEvent.doors_at,
                updatedEvent.vendor_id,
                updatedEvent.info,
                updatedEvent.price,
                body.ids[index],
            ],
        ))
    );

    return results
        .flatMap((result) => result.rows)
        .map((row) => parse(server, EventSchema, row, ParseContext.Database));
}