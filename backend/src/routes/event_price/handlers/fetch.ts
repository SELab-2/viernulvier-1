import z from "zod";
import type { FastifyInstance, FastifyRequest } from "fastify";

import { buildQuery, parseParams } from "@/routes/helpers.js";
import { EventSchema, stringToInt } from "@viernulvier/shared/index.js";
import type { Event, EventWithMeta } from "@viernulvier/shared/index.js";

/**
 * Fetches a single event by ID from the database.
 * Returns `null` when the event does not exist or validation fails.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request containing the event route parameter.
 * @returns The parsed event, or `null` if not found or validation failed.
 */
export async function fetchEventPrice(
    server: FastifyInstance,
    request: FastifyRequest
): Promise<Event | null> {
    const { id } = parseParams(request, z.object({ id: stringToInt }));
    const result = await buildQuery(server,
        `SELECT id, event, amount
        FROM events WHERE id = $1`,
        z.tuple([z.int()]),
        EventSchema,
    )(id);

    return result[0] ?? null;
}

/**
 * Fetches a single event by ID including metadata fields.
 * Returns `null` when the event does not exist or validation fails.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request containing the event route parameter.
 * @returns The parsed event with metadata, or `null` if not found or validation failed.
 */
export async function fetchEventPriceWithMeta(
    server: FastifyInstance,
    request: FastifyRequest
): Promise<EventWithMeta | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
    const result = await buildQuery(
        server,
        `SELECT id, event, amount
        FROM events WHERE id = $1`,
        z.tuple([z.int()]),
        EventSchema.withMeta(),
    )(id);

    return result[0] ?? null;
}

/**
 * Fetches all events from the database.
 * Returns an empty array when parsing fails.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @returns An array of parsed events.
 */
export async function fetchEventPrices(
    server: FastifyInstance
): Promise<Event[]> {
    const result = await buildQuery(
        server,
        `SELECT id, event, amount
        FROM events`,
        EventSchema
    )();

    return result ?? [];
}