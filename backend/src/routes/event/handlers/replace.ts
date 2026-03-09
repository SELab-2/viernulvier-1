import type { FastifyInstance, FastifyRequest } from "fastify";

import { getParam, parse, ParseContext, parseFirstRow } from "@/routes/helpers.js";
import { EventSchema } from "@viernulvier/shared/types/event.js";
import type { Event } from "@viernulvier/shared/types/event.js";

function normalizeEventDates(value: unknown): unknown {
    if (!value || typeof value !== "object") return value;

    const payload = value as Record<string, unknown>;
    return {
        ...payload,
        starts_at: payload["starts_at"] instanceof Date ? payload["starts_at"] : new Date(String(payload["starts_at"])),
        ends_at: payload["ends_at"] instanceof Date ? payload["ends_at"] : new Date(String(payload["ends_at"])),
        doors_at: payload["doors_at"] instanceof Date ? payload["doors_at"] : new Date(String(payload["doors_at"])),
    };
}

/**
 * Replaces a single event by ID in the database or creates a new one if not found.
 * Returns `null` when validation fails.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request containing the event route parameter and updated data.
 * @returns The parsed event, or `null` if not found or validation failed.
 */
export async function replaceEvent(
    server: FastifyInstance,
    request: FastifyRequest
): Promise<Event | null> {
    const normalizedBody = normalizeEventDates(request.body);
    const body = parse<Event>(server, EventSchema, normalizedBody, ParseContext.Request);

    const result = await server.pg.query<Event>(
        `UPDATE events
         SET starts_at = $1, ends_at = $2, production_id = $3, hall = $4, doors_at = $5, vendor_id = $6, info = $7, price = $8
         WHERE id = $9
         RETURNING id, starts_at, ends_at, production_id, hall, doors_at, vendor_id, info, price`,
        [
            body.starts_at,
            body.ends_at,
            body.production_id,
            body.hall,
            body.doors_at,
            body.vendor_id,
            body.info,
            body.price,
            getParam(request, "id"),
        ],
    );

    return parseFirstRow(server, EventSchema, result.rows);
}