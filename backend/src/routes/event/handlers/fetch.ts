import z from "zod";
import type { FastifyInstance, FastifyRequest } from "fastify";

import { buildQuery, parseParams, parseSchema } from "@/routes/helpers.js";
import { EventSchema, stringToInt } from "@viernulvier/shared/index.js";
import type { Event, EventWithMeta } from "@viernulvier/shared/index.js";
import { selectPriceSubquery } from "./helper.js";

/**
 * Fetches a single event by ID from the database.
 * Returns `null` when the event does not exist or validation fails.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request containing the event route parameter.
 * @returns The parsed event, or `null` if not found or validation failed.
 */
export async function fetchEvent(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Event | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const result = await buildQuery(server,
    `SELECT id, old_id, starts_at, ends_at, production, hall, doors_at, info, ${selectPriceSubquery}
    FROM event WHERE id = $1`,
    z.tuple([z.int()]),
    EventSchema,
  )(id);

  return result[0]!;
}

/**
 * Fetches a single event by ID including metadata fields.
 * Returns `null` when the event does not exist or validation fails.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request containing the event route parameter.
 * @returns The parsed event with metadata, or `null` if not found or validation failed.
 */
export async function fetchEventWithMeta(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<EventWithMeta | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const result = await buildQuery(
    server,
    `SELECT id, old_id, starts_at, ends_at, production, hall, doors_at, info, ${selectPriceSubquery},
        created_at, updated_at, created_by, updated_by
    FROM event WHERE id = $1`,
    z.tuple([z.int()]),
    EventSchema.withMeta(),
  )(id);

  return result[0]!;
}

const EventsListQuerySchema = z.object({
  production: stringToInt.optional(),
  old_id: stringToInt.optional(),
});

const fetchEventsAllQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `SELECT id, old_id, starts_at, ends_at, production, hall, doors_at, info, ${selectPriceSubquery}
     FROM event
     ORDER BY starts_at`,
    EventSchema,
  );

const fetchEventsByProductionQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `SELECT id, old_id, starts_at, ends_at, production, hall, doors_at, info, ${selectPriceSubquery}
     FROM event
     WHERE production = $1
     ORDER BY starts_at`,
    z.tuple([z.int()]),
    EventSchema,
  );

const fetchEventsByOldIdQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `SELECT id, old_id, starts_at, ends_at, production, hall, doors_at, info, ${selectPriceSubquery}
     FROM event
     WHERE old_id = $1
     ORDER BY starts_at`,
    z.tuple([z.int()]),
    EventSchema,
  );

/**
 * Fetches events, optionally filtered by a production ID or old_id.
 * Returns an empty array when parsing fails.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, can include query parameters `production` or `old_id` to filter events.
 * @returns An array of parsed events.
 */
export async function fetchEvents(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Event[]> {
  const { production, old_id } = parseSchema(
    server,
    EventsListQuerySchema,
    request.query,
  );

  const result =
    production !== undefined
      ? await fetchEventsByProductionQuery(server)(production)
      : old_id !== undefined
        ? await fetchEventsByOldIdQuery(server)(old_id)
        : await fetchEventsAllQuery(server)();

  return result;
}
