import type { FastifyInstance } from "fastify";

import { replyHandler } from "../helpers.js";
import { createEvent } from "./handlers/create.js";
import { deleteEvent } from "./handlers/delete.js";
import { fetchEvent, fetchEvents, fetchEventWithMeta } from "./handlers/fetch.js";
import { replaceEvent } from "./handlers/replace.js";

export default function eventRoutes(server: FastifyInstance) {
    server.get("/api/event/:id", replyHandler(server, fetchEvent));
    server.get("/api/event/:id/meta", replyHandler(server, fetchEventWithMeta));
    server.get("/api/event", replyHandler(server, fetchEvents));
    server.post("/api/event", replyHandler(server, createEvent));
    server.delete("/api/event/:id", replyHandler(server, deleteEvent));
    server.put("/api/event/:id", replyHandler(server, replaceEvent));
}