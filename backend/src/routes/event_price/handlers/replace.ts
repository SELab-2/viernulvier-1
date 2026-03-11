import type { FastifyInstance, FastifyRequest } from "fastify";
import z from "zod";

import { getMetadata, parseFirstRow, parse, parseParams, ParseContext } from "@/routes/helpers.js";
import { EventPriceSchema, stringToInt } from "@viernulvier/shared/index.js";
import type { EventPrice } from "@viernulvier/shared/index.js";
import { EventPriceCreateSchema } from "./helper.js";
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
	const body: EventPriceCreate = parse(server, EventPriceCreateSchema, request.body, ParseContext.Request);
    const { id } = parseParams(request, z.object({ id: stringToInt }));

	const { admin, current_time } = getMetadata(request);

	const result = await server.pg.query<EventPrice>(
		`UPDATE event_price
		 SET event = $1, amount = $2, updated_at = $3, updated_by = $4
		 WHERE id = $5
		 RETURNING id, event, amount`,
		[
			body.event,
			body.amount,
			current_time,
			admin,
			id,
		],
	);

	return parseFirstRow(server, EventPriceSchema, result.rows);
}
