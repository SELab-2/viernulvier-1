import type { FastifyInstance } from "fastify";
import { replyHandler } from "@/routes/helpers.js";
import { fetchAdmin, fetchAdminWithMeta, createAdmin, replaceAdmin, editAdmin, deleteAdmin, login, logout } from "./handlers/index.js";

/**
 * Registers authentication routes on the Fastify instance.
 *
 * @remarks
 * - `GET /api/v1/auth/:id` — fetch an admin by ID. 🔒
 * - `GET /api/v1/auth/:id/meta` — fetch an admin with metadata by ID. 🔒
 * - `POST /api/v1/auth` — create a new admin. 🔒
 * - `PUT /api/v1/auth/:id` — replace an existing admin's data. 🔒
 * - `PATCH /api/v1/auth/:id` — partially update an existing admin. 🔒
 * - `DELETE /api/v1/auth/:id` — delete an admin by ID. 🔒
 * - `POST /api/v1/auth/login` — authenticate an admin and set a session cookie.
 * - `POST /api/v1/auth/logout` — clear the session cookie.
 *
 * @param server - The Fastify instance to register routes on.
 */
export default function authRoutes(server: FastifyInstance) {
  const protect = { preHandler: [server.authorize] };

  server.get("/api/v1/auth/:id", protect, replyHandler(server, fetchAdmin));
  server.get("/api/v1/auth/:id/meta", protect, replyHandler(server, fetchAdminWithMeta));
  server.post("/api/v1/auth", protect, replyHandler(server, createAdmin));
  server.put("/api/v1/auth/:id", protect, replyHandler(server, replaceAdmin));
  server.patch("/api/v1/auth/:id", protect, replyHandler(server, editAdmin));
  server.delete("/api/v1/auth/:id", protect, replyHandler(server, deleteAdmin));
  server.post("/api/v1/auth/login", replyHandler(server, login));
  server.post("/api/v1/auth/logout", replyHandler(server, logout));
}