import type { FastifyInstance, FastifyRequest } from "fastify";
import z from "zod";

import { getMetadata, ParseContext, parseFirstRow, parseParams, parseSchema } from "@/routes/helpers.js";
import { EventSchema, stringToInt } from "@viernulvier/shared/index.js";
import type { Event } from "@viernulvier/shared/index.js";
import { normalizeEventDates, EventCreateSchema } from "./helper.js";


/**
 * Replaces a single event by ID in the database.
 * Returns `null` when the event does not exist or validation fails.
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
  const body = parseSchema(server, EventCreateSchema, normalizedBody, ParseContext.Request);
  const { id } = parseParams(request, z.object({ id: stringToInt }));

  const { admin, current_time } = getMetadata(request);

  const result = await server.pg.query<Event>(
    `UPDATE events
      SET starts_at = $1, ends_at = $2, production = $3, hall = $4, doors_at = $5, vendor_id = $6, info = $7,
        updated_at = $8, updated_by = $9
      WHERE id = $10
      RETURNING id, starts_at, ends_at, production, hall, doors_at, vendor_id, info, 
        (SELECT COALESCE(ARRAY_AGG(ep.id), '{}') FROM event_prices ep WHERE ep.event = events.id) AS price`,
    [
      body.starts_at,
      body.ends_at,
      body.production,
      body.hall,
      body.doors_at,
      body.vendor_id,
      body.info,
      current_time,
      admin,
      id,
    ],
  );

  return parseFirstRow(server, EventSchema, result.rows);
}