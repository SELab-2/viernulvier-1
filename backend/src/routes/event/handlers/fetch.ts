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

  return result[0] ?? null;
}

/** Max distinct production IDs accepted in `?production=1,2,3` (comma-separated). */
const MAX_EVENT_PRODUCTION_FILTER = 100;

function parseProductionIdsFromQuery(
  production: string | string[] | undefined,
): { ok: true; ids: number[] | undefined } | { ok: false } {
  if (production === undefined) {
    return { ok: true, ids: undefined };
  }
  const raw = Array.isArray(production) ? production.join(",") : production;
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: true, ids: undefined };
  }
  const ids = trimmed
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((p) => Number.parseInt(p, 10))
    .filter((n) => Number.isFinite(n) && n >= 1);
  const unique = [...new Set(ids)].slice(0, MAX_EVENT_PRODUCTION_FILTER);
  if (unique.length === 0) {
    return { ok: false };
  }
  return { ok: true, ids: unique };
}

export const EventsListQuerySchema = z
  .object({
    production: z.union([z.string(), z.array(z.string())]).optional(),
    old_id: stringToInt.optional(),
  })
  .transform((q, ctx) => {
    const parsed = parseProductionIdsFromQuery(q.production);
    if (!parsed.ok) {
      ctx.addIssue({
        code: "custom",
        path: ["production"],
        message: "Invalid production id(s)",
      });
      return z.NEVER;
    }
    return { production: parsed.ids, old_id: q.old_id };
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

const fetchEventsByProductionIdsQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `SELECT id, old_id, starts_at, ends_at, production, hall, doors_at, info, ${selectPriceSubquery}
     FROM event
     WHERE production = ANY($1::int[])
     ORDER BY starts_at`,
    z.tuple([z.array(z.number().int().positive())]),
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
 * Fetches events, optionally filtered by production ID(s) or old_id.
 *
 * - `production`: one ID (`?production=5`) or comma-separated (`?production=5,6,7`), up to 100 distinct IDs.
 * - `old_id`: filter by legacy id.
 * - Neither: returns all events (ordered by `starts_at`).
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
    production !== undefined && production.length > 0
      ? production.length === 1
        ? await fetchEventsByProductionQuery(server)(production[0]!)
        : await fetchEventsByProductionIdsQuery(server)(production)
      : old_id !== undefined
        ? await fetchEventsByOldIdQuery(server)(old_id)
        : await fetchEventsAllQuery(server)();

  return result;
}
