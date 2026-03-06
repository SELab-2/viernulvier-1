import type { FastifyInstance, FastifyRequest } from "fastify";

import { getParam, parseFirstRow, safeParse } from "../helpers.js";
import { EventSchema } from "@viernulvier/shared/types/event.js";
import type { Event, EventWithMeta } from "@viernulvier/shared/types/event.js";

export async function fetchEvent(server: FastifyInstance, request: FastifyRequest): Promise<Event | null> {
  const result = await server.pg.query<Event>(
    `SELECT id, starts_at, ends_at, production_id, hall, doors_at, vendor_id, info, price
     FROM events WHERE id = $1`,
    [getParam(request, "id")]
  );

  return parseFirstRow(server, EventSchema, result.rows);
}

export async function fetchEventWithMeta(server: FastifyInstance, request: FastifyRequest): Promise<EventWithMeta | null> {
  const result = await server.pg.query<EventWithMeta>(
    `SELECT id, starts_at, ends_at, production_id, hall, doors_at, vendor_id, info, price,
              created_at, updated_at, created_by, updated_by
     FROM events WHERE id = $1`,
    [getParam(request, "id")]
  );

  return parseFirstRow(server, EventSchema.withMeta(), result.rows);
}

export async function fetchEvents(server: FastifyInstance): Promise<Event[]> {
  const result = await server.pg.query<Event>(
    `SELECT id, starts_at, ends_at, production_id, hall, doors_at, vendor_id, info, price
     FROM events`
  );

  return safeParse(server, z.array(EventSchema), result.rows) ?? [];
}