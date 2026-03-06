import type { FastifyInstance } from "fastify";

import { fetchHandler } from "./helpers.js";
import { fetchEvent, fetchEvents, fetchEventWithMeta } from "./event/fetch.js";

export default function eventRoutes(server: FastifyInstance) {
    server.get("/api/event/:id", fetchHandler(server, fetchEvent));
    server.get("/api/event/:id/meta", fetchHandler(server, fetchEventWithMeta));
    server.get("/api/event", fetchHandler(server, fetchEvents));
}