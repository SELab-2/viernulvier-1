import type { FastifyInstance } from "fastify";
import { replyHandler } from "@/routes/helpers.js";
import { fetchAdmin, fetchAdminWithMeta, createAdmin, replaceAdmin, editAdmin, deleteAdmin, login, logout, fetchAdmins, fetchCurrentlyLoggedInAdmin, fetchCurrentlyLoggedInAdminWithMeta, editOwnPassword } from "./handlers/index.js";

/**
 * Registers authentication routes on the Fastify instance.
 *
 * @remarks
 * - `GET /api/v1/auth` — fetch all admins. 🔒🔑
 * - `GET /api/v1/auth/:id` — fetch an admin by ID. 🔒🔑
 * - `GET /api/v1/auth/:id/meta` — fetch an admin with metadata by ID. 🔒🔑
 * - `GET /api/v1/auth/me` — fetch the currently authenticated admin. 🔒
 * - `GET /api/v1/auth/me/meta` — fetch the currently authenticated admin with metadata. 🔒
 *
 * - `POST /api/v1/auth` — create a new admin. 🔒🔑
 * - `PUT /api/v1/auth/:id` — replace an existing admin's data. 🔒🔑
 * - `PATCH /api/v1/auth/:id` — partially update an existing admin. 🔒🔑
 * - `DELETE /api/v1/auth/:id` — delete an admin by ID. 🔒🔑
 *
 * - `POST /api/v1/auth/login` — authenticate an admin and set a session cookie.
 * - `POST /api/v1/auth/logout` — revoke the session token and clear the session cookie. 🔒
 *
 * 🔒 Requires a valid session. 🔑 Requires super privileges.
 *
 * @param server - The Fastify instance to register routes on.
 */
export default function authRoutes(server: FastifyInstance) {
  const protect = { preHandler: [server.authorize()] };
  const protectSuper = { preHandler: [server.authorize({ super: true })] };

  server.get("/api/v1/auth", protectSuper, replyHandler(server, fetchAdmins));
  server.get("/api/v1/auth/:id", protectSuper, replyHandler(server, fetchAdmin));
  server.get("/api/v1/auth/:id/meta", protectSuper, replyHandler(server, fetchAdminWithMeta));
  server.get("/api/v1/auth/me", protect, replyHandler(server, fetchCurrentlyLoggedInAdmin));
  server.get("/api/v1/auth/me/meta", protect, replyHandler(server, fetchCurrentlyLoggedInAdminWithMeta));

  server.post("/api/v1/auth", protectSuper, replyHandler(server, createAdmin));
  server.put("/api/v1/auth/:id", protectSuper, replyHandler(server, replaceAdmin));
  server.patch("/api/v1/auth/:id", protectSuper, replyHandler(server, editAdmin));
  server.patch("/api/v1/auth/me", protectSuper, replyHandler(server, editOwnPassword));
  server.delete("/api/v1/auth/:id", protectSuper, replyHandler(server, deleteAdmin));

  server.post("/api/v1/auth/login", replyHandler(server, login));
  server.post("/api/v1/auth/logout", protect, replyHandler(server, logout));
}