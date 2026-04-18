import type { FastifyInstance, FastifyRequest } from "fastify";
import z from "zod";

import { getMetadata, ParseContext, buildQuery, parseSchema } from "@/routes/helpers.js";
import { EventPriceSchema } from "@viernulvier/shared/index.js";
import type { EventPrice } from "@viernulvier/shared/index.js";
import { EventPriceCreateSchema } from "./helper.js";
import type { EventPriceCreate } from "./helper.js";

/**
 * Creates a new event price and returns the created record.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `event` and `amount` in the body.
 * @returns The created event price, or `null` if the insert failed or parsing failed.
 */
export async function createEventPrice(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<EventPrice | null> {
  const body: EventPriceCreate = parseSchema(server, EventPriceCreateSchema, request.body, ParseContext.Request);

  const { admin, current_time } = getMetadata(request);

  const result = await buildQuery(
    server,
    `INSERT INTO event_price (event, amount, created_at, updated_at, created_by, updated_by)
      VALUES ($1, $2, $3, $3, $4, $4)
      RETURNING id, event, amount::float`,
    z.tuple([
      EventPriceCreateSchema.shape.event,
      EventPriceCreateSchema.shape.amount,
      z.date(),
      z.number().nonnegative(),
    ]),
    EventPriceSchema,
  )(body.event, body.amount, current_time, admin);

  return result[0]!;
}
