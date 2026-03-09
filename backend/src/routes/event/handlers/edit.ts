import type { FastifyInstance, FastifyRequest } from "fastify";

import { getParam, parse, parseFirstRow, ParseContext } from "@/routes/helpers.js";
import { EventSchema } from "@viernulvier/shared/types/event.js";
import type { Event } from "@viernulvier/shared/types/event.js";
import { fetchEvent } from "./fetch.js";

const EventUpdateSchema = EventSchema.partial();

function normalizeEventDates(value: unknown): unknown {
    if (!value || typeof value !== "object") return value;

    const payload = value as Record<string, unknown>;
    return {
        ...payload,
        starts_at: payload["starts_at"] === undefined
            ? undefined
            : payload["starts_at"] instanceof Date
                ? payload["starts_at"]
                : new Date(String(payload["starts_at"])),
        ends_at: payload["ends_at"] === undefined
            ? undefined
            : payload["ends_at"] instanceof Date
                ? payload["ends_at"]
                : new Date(String(payload["ends_at"])),
        doors_at: payload["doors_at"] === undefined
            ? undefined
            : payload["doors_at"] instanceof Date
                ? payload["doors_at"]
                : new Date(String(payload["doors_at"])),
    };
}

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
    const normalizedBody = normalizeEventDates(request.body);
    const body = parse<Event>(server, EventUpdateSchema, normalizedBody, ParseContext.Request);
    const selectedEvent = await fetchEvent(server, request);

    if (!selectedEvent) return null;

    const updatedEvent: Event = {
        starts_at: body.starts_at ?? selectedEvent.starts_at,
        ends_at: body.ends_at ?? selectedEvent.ends_at,
        production_id: body.production_id ?? selectedEvent.production_id,
        hall: body.hall ?? selectedEvent.hall,
        doors_at: body.doors_at ?? selectedEvent.doors_at,
        vendor_id: body.vendor_id ?? selectedEvent.vendor_id,
        info: body.info ?? selectedEvent.info,
        price: body.price ?? selectedEvent.price,
    };

    const result = await server.pg.query<Event>(
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
            getParam(request, "id"),
        ],
    );

    return parseFirstRow(server, EventSchema, result.rows);
}