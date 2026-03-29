import type { FastifyInstance, FastifyRequest } from "fastify";
import z from "zod";

import { getMetadata, ParseContext, parseParams, parseSchema } from "@/routes/helpers.js";
import { stringToInt } from "@viernulvier/shared/index.js";
import type { Event } from "@viernulvier/shared/index.js";
import { normalizeEventDates, EventCreateSchema, updateEvent } from "./helper.js";


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
  request: FastifyRequest,
): Promise<Event | null> {
  const normalizedBody = normalizeEventDates(request.body);
  const body = parseSchema(server, EventCreateSchema, normalizedBody, ParseContext.Request);
  const { id } = parseParams(request, z.object({ id: stringToInt }));

  const { admin, current_time } = getMetadata(request);

  const result = await updateEvent(server)(
    body.old_id,
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
  );

  return result[0]!;
}