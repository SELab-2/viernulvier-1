import type { FastifyInstance } from "fastify";

import { replyHandler } from "@/routes/helpers.js";
import {
  createEvent,
  deleteEvent,
  fetchEvent,
  fetchEvents,
  fetchEventWithMeta,
  replaceEvent,
  editEvent,
  editEvents,
} from "./handlers/index.js";
import {
  fetchEventDocs,
  fetchEventWithMetaDocs,
  fetchEventsDocs,
  createEventDocs,
  deleteEventDocs,
  replaceEventDocs,
  editEventDocs,
  editEventsDocs,
} from "./docs/index.js";

/**
 * Registers event routes on the Fastify instance.
 *
 * @remarks
 * - `GET /api/v1/event/:id` — fetch a single event by ID.
 * - `GET /api/v1/event/:id/meta` — fetch a single event with metadata by ID. 🔒
 * - `GET /api/v1/event` — fetch all events.
 * - `POST /api/v1/event` — create an event. 🔒
 * - `DELETE /api/v1/event/:id` — delete an event by ID. 🔒
 * - `PUT /api/v1/event/:id` — replace an event. 🔒
 * - `PATCH /api/v1/event/:id` — partially update an event. 🔒
 * - `PATCH /api/v1/event` — bulk partial update of events. 🔒
 *
 * @param server - The Fastify instance to register routes on.
 */
export default function eventRoutes(server: FastifyInstance) {
  const protect = { preValidation: [server.authorize()] };

  server.get(
    "/api/v1/event/:id",
    { schema: fetchEventDocs },
    replyHandler(server, fetchEvent),
  );
  server.get(
    "/api/v1/event/:id/meta",
    { ...protect, schema: fetchEventWithMetaDocs },
    replyHandler(server, fetchEventWithMeta),
  );
  server.get(
    "/api/v1/event",
    { schema: fetchEventsDocs },
    replyHandler(server, fetchEvents),
  );
  server.post(
    "/api/v1/event",
    { ...protect, schema: createEventDocs },
    replyHandler(server, createEvent),
  );
  server.delete(
    "/api/v1/event/:id",
    { ...protect, schema: deleteEventDocs },
    replyHandler(server, deleteEvent),
  );
  server.put(
    "/api/v1/event/:id",
    { ...protect, schema: replaceEventDocs },
    replyHandler(server, replaceEvent),
  );
  server.patch(
    "/api/v1/event/:id",
    { ...protect, schema: editEventDocs },
    replyHandler(server, editEvent),
  );
  server.patch(
    "/api/v1/event",
    { ...protect, schema: editEventsDocs },
    replyHandler(server, editEvents),
  );
}