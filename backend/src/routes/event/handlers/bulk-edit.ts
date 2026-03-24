import type { FastifyInstance, FastifyRequest } from "fastify";
import z from "zod";

import { getMetadata, parseSchema, ParseContext } from "@/routes/helpers.js";
import type { Event } from "@viernulvier/shared/index.js";
import { fetchEvent } from "./fetch.js";
import { EventCreateSchema, normalizePartialEventDates, updateEvent } from "./helper.js";

// Define schema with explicit types to avoid ForeignKey issues
const EventBulkUpdateSchema = EventCreateSchema.partial().extend({
  ids: z.array(z.number().nonnegative()).nonempty(),
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
  request: FastifyRequest,
): Promise<Event[] | null> {
  const normalizedBody = normalizePartialEventDates(request.body);
  const body = parseSchema(server, EventBulkUpdateSchema, normalizedBody, ParseContext.Request);
  const selectedEvents = await Promise.all(
    body.ids.map((id: number) => fetchEvent(
      server,
      { ...request, params: { ...(request.params as Record<string, string>), id: String(id) } },
    )),
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
    old_id: body.old_id ?? selectedEvent.old_id,
  }));

  const { admin, current_time } = getMetadata(request);

  const results = await Promise.all(
    updatedEvents.map((updatedEvent, index) => updateEvent(server)(
      updatedEvent.starts_at,
      updatedEvent.ends_at,
      updatedEvent.production,
      updatedEvent.hall,
      updatedEvent.doors_at,
      updatedEvent.vendor_id,
      updatedEvent.info,
      updatedEvent.old_id,
      current_time,
      admin,
      // eslint-disable-next-line security/detect-object-injection
      Number(body.ids[index]),
    )),
  );

  return results.map(result => result[0]).filter((event): event is Event => !!event)!;
}