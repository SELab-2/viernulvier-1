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
    editEvents
 } from "./handlers/index.js";

export default function eventRoutes(server: FastifyInstance) {
    server.get("/api/v1/event/:id", replyHandler(server, fetchEvent));
    server.get("/api/v1/event/:id/meta", replyHandler(server, fetchEventWithMeta));
    server.get("/api/v1/event", replyHandler(server, fetchEvents));
    server.post("/api/v1/event", replyHandler(server, createEvent));
    server.delete("/api/v1/event/:id", replyHandler(server, deleteEvent));
    server.put("/api/v1/event/:id", replyHandler(server, replaceEvent));
    server.patch("/api/v1/event/:id", replyHandler(server, editEvent));
    server.patch("/api/v1/event", replyHandler(server, editEvents));
}