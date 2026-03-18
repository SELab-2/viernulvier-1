import type { FastifyInstance, FastifyRequest } from "fastify";
import z from "zod";

import { ParseContext, getMetadata, parseParams, parseSchema } from "@/routes/helpers.js";
import { stringToInt } from "@viernulvier/shared/index.js";
import type { Event } from "@viernulvier/shared/index.js";
import { fetchEvent } from "./fetch.js";
import { normalizePartialEventDates, EventCreateSchema, updateEvent } from "./helper.js";
import type { EventCreate } from "./helper.js";

const EventUpdateSchema = EventCreateSchema.partial();

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
  const normalizedBody = normalizePartialEventDates(request.body);
  const body = parseSchema(server, EventUpdateSchema, normalizedBody, ParseContext.Request);
  const selectedEvent = await fetchEvent(server, request);

  if (!selectedEvent) return null;

  const updatedEvent: EventCreate = {
    starts_at: body.starts_at ?? selectedEvent.starts_at,
    ends_at: body.ends_at ?? selectedEvent.ends_at,
    production: body.production ?? selectedEvent.production,
    hall: body.hall ?? selectedEvent.hall,
    doors_at: body.doors_at ?? selectedEvent.doors_at,
    info: body.info ?? selectedEvent.info,
  };

  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const { current_time, admin } = getMetadata(request);

  const result = await updateEvent(server)(
    updatedEvent.starts_at,
    updatedEvent.ends_at,
    updatedEvent.production,
    updatedEvent.hall,
    updatedEvent.doors_at,
    updatedEvent.info,
    current_time,
    admin,
    id,
  );

  return result[0]!;
}