import type { FastifyInstance } from "fastify";

import { replyHandler } from "@/routes/helpers.js";
import { 
    createEventPrice,
    deleteEventPrice,   
    fetchEventPrice, 
    fetchEventPrices, 
    fetchEventPriceWithMeta, 
    replaceEventPrice, 
    editEventPrice,
 } from "./handlers/index.js";

export default function eventPriceRoutes(server: FastifyInstance) {
    const protect = { preHandler: [server.authorize] };

    server.get("/event_price/:id", replyHandler(server, fetchEventPrice));
    server.get("/event_price/:id/meta", protect, replyHandler(server, fetchEventPriceWithMeta));
    server.get("/event_price", replyHandler(server, fetchEventPrices));
    server.post("/event_price", protect, replyHandler(server, createEventPrice));
    server.put("/event_price/:id", protect, replyHandler(server, replaceEventPrice));
    server.patch("/event_price/:id", protect, replyHandler(server, editEventPrice));
    server.delete("/event_price/:id", protect, replyHandler(server, deleteEventPrice));
}