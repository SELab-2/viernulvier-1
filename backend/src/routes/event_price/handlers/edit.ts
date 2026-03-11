import type { FastifyInstance, FastifyRequest } from "fastify";
import z from "zod";

import { getMetadata, parseFirstRow, parse, parseParams, ParseContext } from "@/routes/helpers.js";
import { EventPriceSchema, stringToInt } from "@viernulvier/shared/index.js";
import type { EventPrice } from "@viernulvier/shared/index.js";
import { EventPriceCreateSchema } from "./helper.js";
import type { EventPriceCreate } from "./helper.js";
import { fetchEventPrice } from "./index.js";

const EventPriceUpdateSchema = EventPriceCreateSchema.partial();

/**
 * Updates certain fields from a single event price by ID in the database.
 * Returns `null` when the event price does not exist or validation fails.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request containing the event price route parameter and updated data.
 * @returns The parsed event price, or `null` if not found or validation failed.
 */
export async function editEventPrice(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<EventPrice | null> {
  const body = parse(server, EventPriceUpdateSchema, request.body, ParseContext.Request);
  const { id } = parseParams(request, z.object({ id: stringToInt }));

  const selectedEventPrice = await fetchEventPrice(server, request);

  if (!selectedEventPrice) return null;

  const updatedEventPrice: EventPriceCreate = {
    event: body.event ?? selectedEventPrice.event,
    amount: body.amount ?? selectedEventPrice.amount,
  };

  const { admin, current_time } = getMetadata(request);

  const result = await server.pg.query<EventPrice>(
    `UPDATE event_price
      SET event = $1, amount = $2, updated_at = $3, updated_by = $4
      WHERE id = $5
      RETURNING id, event, amount`,
    [
      updatedEventPrice.event,
      updatedEventPrice.amount,
      current_time,
      admin,
      id,
    ],
  );

  return parseFirstRow(server, EventPriceSchema, result.rows);
}
