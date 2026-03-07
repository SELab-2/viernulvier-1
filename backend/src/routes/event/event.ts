import type { FastifyInstance } from "fastify";

import { replyHandler } from "../helpers.js";
import { createEvent } from "./handlers/create.js";
import { fetchEvent, fetchEvents, fetchEventWithMeta } from "./handlers/fetch.js";

export default function eventRoutes(server: FastifyInstance) {
    server.get("/api/event/:id", replyHandler(server, fetchEvent));
    server.get("/api/event/:id/meta", replyHandler(server, fetchEventWithMeta));
    server.get("/api/event", replyHandler(server, fetchEvents));
    server.post("/api/event", replyHandler(server, createEvent));
}