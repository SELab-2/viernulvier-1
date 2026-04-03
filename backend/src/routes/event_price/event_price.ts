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

/**
 * Registers event price routes on the Fastify instance.
 *
 * @remarks
 * - `GET /api/v1/event/price/:id` — fetch a single event price by ID.
 * - `GET /api/v1/event/price/:id/meta` — fetch a single event price with metadata by ID. 🔒
 * - `GET /api/v1/event/price` — fetch all event prices.
 * - `POST /api/v1/event/price` — create an event price. 🔒
 * - `PUT /api/v1/event/price/:id` — replace an event price. 🔒
 * - `PATCH /api/v1/event/price/:id` — partially update an event price. 🔒
 * - `DELETE /api/v1/event/price/:id` — delete an event price by ID. 🔒
 *
 * @param server - The Fastify instance to register routes on.
 */
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