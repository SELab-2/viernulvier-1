import type { FastifyInstance } from "fastify";
import { replyHandler } from "@/routes/helpers.js";
import { fetchAdmin, fetchAdminWithMeta, createAdmin, replaceAdmin, editAdmin, deleteAdmin } from "./handlers/index.js";

/**
 * Registers authentication routes on the Fastify instance.
 *
 * @remarks
 * - `GET /api/v1/auth/:id` — fetch an admin by ID.
 * - `GET /api/v1/auth/:id/meta` — fetch an admin with metadata by ID.
 * - `POST /api/v1/auth` — create a new admin.
 * - `PUT /api/v1/auth/:id` — replace an existing admin's data.
 * - `PATCH /api/v1/auth/:id` — partially update an existing admin.
 *
 * @param server - The Fastify instance to register routes on.
 */
export default function authRoutes(server: FastifyInstance) {
  server.get("/api/v1/auth/:id", replyHandler(server, fetchAdmin));
  server.get("/api/v1/auth/:id/meta", replyHandler(server, fetchAdminWithMeta));
  server.post("/api/v1/auth", replyHandler(server, createAdmin));
  server.put("/api/v1/auth/:id", replyHandler(server, replaceAdmin));
  server.patch("/api/v1/auth/:id", replyHandler(server, editAdmin));
  server.delete("/api/v1/auth/:id", replyHandler(server, deleteAdmin));
}