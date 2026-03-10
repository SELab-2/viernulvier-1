import type { FastifyInstance, FastifyRequest } from "fastify";

import { getParam, parse, ParseContext, parseFirstRow, getMetadata } from "@/routes/helpers.js";
import { EventSchema } from "@viernulvier/shared/types/event.js";
import type { Event } from "@viernulvier/shared/types/event.js";
import { normalizeEventDates } from "./helper.js";
import { fetchEvent } from "./fetch.js";

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
    const existing = await fetchEvent(server, request);
    const normalizedBody = normalizeEventDates(request.body);
    const body = parse<Event>(server, EventSchema, normalizedBody, ParseContext.Request);
    const id = getParam(request, "id");

    const { admin, current_time } = getMetadata(request);

    if (!existing) {
        const insertResult = await server.pg.query<Event>(
            `INSERT INTO events (id, starts_at, ends_at, production, hall, doors_at, vendor_id, info, price, 
            created_by, updated_by, created_at, updated_at)
            VALUES ($11, $1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10, $10)
            RETURNING id, starts_at, ends_at, production, hall, doors_at, vendor_id, info, price`,
            [
                body.starts_at,
                body.ends_at,
                body.production,
                body.hall,
                body.doors_at,
                body.vendor_id,
                body.info,
                body.price,
                admin,
                current_time,
                id,
            ],
        );

        return parseFirstRow(server, EventSchema, insertResult.rows);
    }

    const result = await server.pg.query<Event>(
        `UPDATE events
         SET starts_at = $1, ends_at = $2, production_id = $3, hall = $4, doors_at = $5, vendor_id = $6, info = $7, price = $8, updated_by = $9, updated_at = $10
         WHERE id = $11
         RETURNING id, starts_at, ends_at, production_id, hall, doors_at, vendor_id, info, price`,
        [
            body.starts_at,
            body.ends_at,
            body.production,
            body.hall,
            body.doors_at,
            body.vendor_id,
            body.info,
            body.price,
            admin,
            current_time,
            id,
        ],
    );

    return parseFirstRow(server, EventSchema, result.rows);
}