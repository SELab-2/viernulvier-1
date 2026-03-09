import type { FastifyInstance, FastifyRequest } from "fastify";

import { parseFirstRow, parse, ParseContext } from "@/routes/helpers.js";
import { EventSchema } from "@viernulvier/shared/types/event.js";
import type { Event } from "@viernulvier/shared/types/event.js";
import { normalizeEventDates } from "./helper.js";

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
	const body = parse<Event>(server, EventSchema, normalizedBody, ParseContext.Request);

	const result = await server.pg.query<Event>(
		`INSERT INTO events (starts_at, ends_at, production_id, hall, doors_at, vendor_id, info, price)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, starts_at, ends_at, production_id, hall, doors_at, vendor_id, info, price`,
		[
			body.starts_at,
			body.ends_at,
			body.production_id,
			body.hall,
			body.doors_at,
			body.vendor_id,
			body.info,
			body.price,
		],
	);

	return parseFirstRow(server, EventSchema, result.rows);
}

