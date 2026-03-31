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
  const protect = { preHandler: [server.authorize()] };
  server.get("/api/v1/event/price/:id", replyHandler(server, fetchEventPrice));
  server.get("/api/v1/event/price/:id/meta", protect, replyHandler(server, fetchEventPriceWithMeta));
  server.get("/api/v1/event/price", replyHandler(server, fetchEventPrices));
  server.post("/api/v1/event/price", protect, replyHandler(server, createEventPrice));
  server.put("/api/v1/event/price/:id", protect, replyHandler(server, replaceEventPrice));
  server.patch("/api/v1/event/price/:id", protect, replyHandler(server, editEventPrice));
  server.delete("/api/v1/event/price/:id", protect, replyHandler(server, deleteEventPrice));
}