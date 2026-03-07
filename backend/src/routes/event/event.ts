import type { FastifyInstance } from "fastify";

import { replyHandler } from "@/routes/helpers.js";
import { 
    createEvent,
    deleteEvent,   
    fetchEvent, 
    fetchEvents, 
    fetchEventWithMeta, 
    replaceEvent, 
    editEvent
 } from "./handlers/index.js";

export default function eventRoutes(server: FastifyInstance) {
    server.get("/api/event/:id", replyHandler(server, fetchEvent));
    server.get("/api/event/:id/meta", replyHandler(server, fetchEventWithMeta));
    server.get("/api/event", replyHandler(server, fetchEvents));
    server.post("/api/event", replyHandler(server, createEvent));
    server.delete("/api/event/:id", replyHandler(server, deleteEvent));
    server.put("/api/event/:id", replyHandler(server, replaceEvent));
    server.patch("/api/event/:id", replyHandler(server, editEvent));
}