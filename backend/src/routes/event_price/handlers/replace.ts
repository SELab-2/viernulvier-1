import type { FastifyInstance, FastifyRequest } from "fastify";
import z from "zod";

import { getMetadata, parseParams, ParseContext, parseSchema } from "@/routes/helpers.js";
import { stringToInt } from "@viernulvier/shared/index.js";
import type { EventPrice } from "@viernulvier/shared/index.js";
import { EventPriceCreateSchema, updateEventPrice } from "./helper.js";
import type { EventPriceCreate } from "./helper.js";

/**
 * Replaces an existing event price and returns the updated record.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in params and `event` and `amount` in the body.
 * @returns The updated event price, or `null` if the update failed or parsing failed.
 */
export async function replaceEventPrice(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<EventPrice | null> {
  const body: EventPriceCreate = parseSchema(server, EventPriceCreateSchema, request.body, ParseContext.Request);
  const { id } = parseParams(request, z.object({ id: stringToInt }));

  const { admin, current_time } = getMetadata(request);

  const result = await updateEventPrice(server)(
    body.event,
    body.amount,
    current_time,
    admin,
    id,
  );

  return result[0]!;
}
