import type { FastifyInstance, FastifyRequest } from "fastify";
import z from "zod";

import { getMetadata, parse, ParseContext } from "@/routes/helpers.js";
import { EventSchema } from "@viernulvier/shared/index.js";
import type { Event } from "@viernulvier/shared/index.js";
import { fetchEvent } from "./fetch.js";
import { EventCreateSchema, normalizePartialEventDates } from "./helper.js";

// Define schema with explicit types to avoid ForeignKey issues
const EventBulkUpdateSchema = EventCreateSchema.partial().extend({
  ids: z.array(z.number().nonnegative()).nonempty()
});

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
  const body = parse(server, EventBulkUpdateSchema, normalizedBody, ParseContext.Request);
  const selectedEvents = await Promise.all(
    body.ids.map((id: number) => fetchEvent(
      server,
      { ...request, params: { ...(request.params as Record<string, string>), id: String(id) } }
    ))
  );

  if (!selectedEvents.length || selectedEvents.some((event: Event | null) => !event)) return null;
  const existingEvents = selectedEvents as Event[];

  const updatedEvents = existingEvents.map((selectedEvent: Event) => ({
    starts_at: body.starts_at ?? selectedEvent.starts_at,
    ends_at: body.ends_at ?? selectedEvent.ends_at,
    production: body.production ?? selectedEvent.production,
    hall: body.hall ?? selectedEvent.hall,
    doors_at: body.doors_at ?? selectedEvent.doors_at,
    vendor_id: body.vendor_id ?? selectedEvent.vendor_id,
    info: body.info ?? selectedEvent.info,
  }));

  const { admin, current_time } = getMetadata(request);

  const results = await Promise.all(
    updatedEvents.map((updatedEvent, index) => server.pg.query<Event>(
      `UPDATE events
      SET starts_at = $1, ends_at = $2, production = $3, hall = $4, doors_at = $5, vendor_id = $6, info = $7, updated_at = $8, updated_by = $9
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
        // eslint-disable-next-line security/detect-object-injection
        body.ids[index],
      ],
    ))
  );

  return results
    .flatMap((result) => result.rows)
    .map((row) => parse(server, EventSchema, row, ParseContext.Database));
}