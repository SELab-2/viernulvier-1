import type { FastifyInstance, FastifyRequest } from "fastify";
import z from "zod";

import { getMetadata, parseSchema, ParseContext, buildQuery } from "@/routes/helpers.js";
import { EventSchema } from "@viernulvier/shared/index.js";
import type { Event } from "@viernulvier/shared/index.js";
import { normalizeEventDates, EventCreateSchema, selectPriceSubquery } from "./helper.js";

/**
 * Creates a new event row in the database.
 * Helpers returns a 400 response when the request body is invalid.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request containing the event payload.
 * @param reply - The Fastify reply used to send HTTP error responses.
 * @returns The created event or `null` upon failure.
 */
export async function createEvent(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Event | null> {
  const normalizedBody = normalizeEventDates(request.body);
  const body = parseSchema(server, EventCreateSchema, normalizedBody, ParseContext.Request);

  const { admin, current_time } = getMetadata(request);

  const result = await buildQuery(
    server,
    `INSERT INTO events (starts_at, ends_at, production, hall, doors_at, vendor_id, info, created_at, updated_at, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $9)
      RETURNING id, starts_at, ends_at, production, hall, doors_at, vendor_id, info, ${selectPriceSubquery}`,
    z.tuple([
      EventCreateSchema.shape.starts_at,
      EventCreateSchema.shape.ends_at,
      EventCreateSchema.shape.production,
      EventCreateSchema.shape.hall,
      EventCreateSchema.shape.doors_at,
      EventCreateSchema.shape.vendor_id,
      EventCreateSchema.shape.info,
      z.date(),
      z.number().nonnegative(),

    ]),
    EventSchema,
  )(
    body.starts_at,
    body.ends_at,
    body.production,
    body.hall,
    body.doors_at,
    body.vendor_id,
    body.info,
    current_time,
    admin,
  );

  return result[0]!;
}

