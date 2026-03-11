import z from "zod";
import type { FastifyInstance, FastifyRequest } from "fastify";

import { buildQuery, parseParams } from "@/routes/helpers.js";
import { EventPriceSchema, stringToInt } from "@viernulvier/shared/index.js";
import type { EventPrice, EventPriceWithMeta } from "@viernulvier/shared/index.js";

/**
 * Fetches a single event price by ID from the database.
 * Returns `null` when the event price does not exist or validation fails.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request containing the event price route parameter.
 * @returns The parsed event price, or `null` if not found or validation failed.
 */
export async function fetchEventPrice(
  server: FastifyInstance,
  request: FastifyRequest
): Promise<EventPrice | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const result = await buildQuery(server,
    `SELECT id, event, amount
    FROM event_price WHERE id = $1`,
    z.tuple([z.int()]),
    EventPriceSchema,
  )(id);

  return result[0] ?? null;
}

/**
 * Fetches a single event price by ID including metadata fields.
 * Returns `null` when the event price does not exist or validation fails.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request containing the event price route parameter.
 * @returns The parsed event price with metadata, or `null` if not found or validation failed.
 */
export async function fetchEventPriceWithMeta(
  server: FastifyInstance,
  request: FastifyRequest
): Promise<EventPriceWithMeta | null> {
const { id } = parseParams(request, z.object({ id: stringToInt }));
  const result = await buildQuery(
    server,
    `SELECT id, event, amount, created_at, updated_at, created_by, updated_by
    FROM event_price WHERE id = $1`,
    z.tuple([z.int()]),
    EventPriceSchema.withMeta(),
  )(id);

  return result[0] ?? null;
}

/**
 * Fetches all event prices from the database.
 * Returns an empty array when parsing fails.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @returns An array of parsed event prices.
 */
export async function fetchEventPrices(
  server: FastifyInstance
): Promise<EventPrice[]> {
  const result = await buildQuery(
    server,
    `SELECT id, event, amount
    FROM event_price`,
    EventPriceSchema
  )();

  return result;
}
