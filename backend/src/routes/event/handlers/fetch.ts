import z from "zod";
import type { FastifyInstance, FastifyRequest } from "fastify";

import { getParam, parseFirstRow, safeParse } from "@/routes/helpers.js";
import { EventSchema } from "@viernulvier/shared/types/event.js";
import type { Event, EventWithMeta } from "@viernulvier/shared/types/event.js";

/**
 * Fetches a single event by ID from the database.
 * Returns `null` when the event does not exist or validation fails.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request containing the event route parameter.
 * @returns The parsed event, or `null` if not found or validation failed.
 */
export async function fetchEvent(server: FastifyInstance, request: FastifyRequest): Promise<Event | null> {
  const result = await server.pg.query<Event>(
    `SELECT id, starts_at, ends_at, production_id, hall, doors_at, vendor_id, info, price
     FROM events WHERE id = $1`,
    [getParam(request, "id")]
  );

  return parseFirstRow(server, EventSchema, result.rows);
}

/**
 * Fetches a single event by ID including metadata fields.
 * Returns `null` when the event does not exist or validation fails.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request containing the event route parameter.
 * @returns The parsed event with metadata, or `null` if not found or validation failed.
 */
export async function fetchEventWithMeta(server: FastifyInstance, request: FastifyRequest): Promise<EventWithMeta | null> {
  const result = await server.pg.query<EventWithMeta>(
    `SELECT id, starts_at, ends_at, production_id, hall, doors_at, vendor_id, info, price,
              created_at, updated_at, created_by, updated_by
     FROM events WHERE id = $1`,
    [getParam(request, "id")]
  );

  return parseFirstRow(server, EventSchema.withMeta(), result.rows);
}

/**
 * Fetches all events from the database.
 * Returns an empty array when parsing fails.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @returns An array of parsed events.
 */
export async function fetchEvents(server: FastifyInstance): Promise<Event[]> {
  const result = await server.pg.query<Event>(
    `SELECT id, starts_at, ends_at, production_id, hall, doors_at, vendor_id, info, price
     FROM events`
  );

  return safeParse(server, z.array(EventSchema), result.rows) ?? [];
}