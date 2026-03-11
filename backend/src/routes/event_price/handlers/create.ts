import type { FastifyInstance, FastifyRequest } from "fastify";

import { getMetadata, parseFirstRow, parse, ParseContext } from "@/routes/helpers.js";
import { EventPriceSchema } from "@viernulvier/shared/index.js";
import type { EventPrice } from "@viernulvier/shared/index.js";
import { EventPriceCreateSchema } from "./helper.js";
import type { EventPriceCreate } from "./helper.js";

/**
 * Creates a new event price row in the database.
 * Helpers returns a 400 response when the request body is invalid.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request containing the event payload.
 * @param reply - The Fastify reply used to send HTTP error responses.
 * @returns The created event or `null` upon failure.
 */
export async function createEventPrice(
	server: FastifyInstance,
	request: FastifyRequest,
): Promise<EventPrice | null> {
	const body: EventPriceCreate = parse(server, EventPriceCreateSchema, request.body, ParseContext.Request);

	const { admin, current_time } = getMetadata(request);

	const result = await server.pg.query<EventPrice>(
		`INSERT INTO event_price (event, amount, created_at, updated_at, created_by, updated_by)
		 VALUES ($1, $2, $3, $3, $4, $4)
		 RETURNING id, event, amount`,
		[
			body.event,
            body.amount,
			current_time,
			admin,
		],
	);

	return parseFirstRow(server, EventPriceSchema, result.rows);
}

