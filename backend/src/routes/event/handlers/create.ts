import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { parseFirstRow } from "@/routes/helpers.js";
import { EventSchema } from "@viernulvier/shared/types/event.js";
import type { Event } from "@viernulvier/shared/types/event.js";

const CreateEventBodySchema = EventSchema.pick({
    starts_at: true,
    ends_at: true,
    production_id: true,
    hall: true,
    doors_at: true,
    vendor_id: true,
    info: true,
    price: true
});

/**
 * Creates a new event row in the database.
 * Returns a 400 response when the request body is invalid.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request containing the event payload.
 * @param reply - The Fastify reply used to send HTTP error responses.
 * @returns The created event.
 */
export async function createEvent(
	server: FastifyInstance,
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<Event | FastifyReply> {
	const parsedBody = CreateEventBodySchema.safeParse(request.body);
	if (!parsedBody.success) {
		return reply.status(400).send({ error: "Invalid event payload" });
	}

	const body = parsedBody.data;

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

	const createdEvent = parseFirstRow(server, EventSchema, result.rows);
	if (!createdEvent) {
		return reply.status(500).send({ error: "Failed to create event" });
	}

	return reply.status(201).send(createdEvent);
}

