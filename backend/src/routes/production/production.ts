import type { FastifyInstance } from "fastify";
import { replyHandler } from "@/routes/helpers.js";
import {
  fetchProduction,
  fetchProductionWithMeta,
  fetchProductions,
  createProduction,
  replaceProduction,
  editProduction,
  bulkEditProductions,
  deleteProduction,
} from "./handlers/index.js";

/**
 * Registers production routes on the Fastify instance.
 *
 * @remarks
 * - `GET /api/v1/production` — fetch a list of productions.
 * - `GET /api/v1/production/:id` — fetch a single production by ID.
 * - `GET /api/v1/production/:id/meta` — fetch a single production with metadata by ID. 🔒
 * - `POST /api/v1/production` — create a new production.
 * - `PUT /api/v1/production/:id` — replace an existing production.
 * - `PATCH /api/v1/production/:id` — partially update an existing production.
 * - `PATCH /api/v1/production/bulk` — bulk update multiple productions.
 * - `DELETE /api/v1/production/:id` — delete a production by ID.
 *
 * @param server - The Fastify instance to register routes on.
 */
export default function productionRoutes(server: FastifyInstance) {
  const protect = { preHandler: [server.authorize] };

  server.get("/api/v1/production", replyHandler(server, fetchProductions));
  server.get("/api/v1/production/:id", replyHandler(server, fetchProduction));
  server.get("/api/v1/production/:id/meta", protect, replyHandler(server, fetchProductionWithMeta));
  server.post("/api/v1/production", protect, replyHandler(server, createProduction));
  server.put("/api/v1/production/:id", protect, replyHandler(server, replaceProduction));
  server.patch("/api/v1/production/:id", protect, replyHandler(server, editProduction));
  server.patch("/api/v1/production/bulk", protect, replyHandler(server, bulkEditProductions));
  server.delete("/api/v1/production/:id", protect, replyHandler(server, deleteProduction));
}

