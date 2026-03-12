import type { FastifyInstance, FastifyRequest } from "fastify";
import z from "zod";

import { getMetadata, parseParams, ParseContext, parseSchema } from "@/routes/helpers.js";
import { stringToInt } from "@viernulvier/shared/index.js";
import type { EventPrice } from "@viernulvier/shared/index.js";
import { EventPriceCreateSchema, updateEventPrice } from "./helper.js";
import type { EventPriceCreate } from "./helper.js";

/**
 * Replaces a single event price row in the database.
 * Helpers returns a 400 response when the request body is invalid.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request containing the event payload.
 * @param reply - The Fastify reply used to send HTTP error responses.
 * @returns The updated event or `null` upon failure.
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
