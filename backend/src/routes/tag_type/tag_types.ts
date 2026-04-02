import type { FastifyInstance } from "fastify";
import { replyHandler } from "@/routes/helpers.js";

import {
  fetchTagType,
  fetchTagTypes,
  createTagType,
  editTagType,
  deleteTagType,
  replaceTagType,
  fetchTagTypeWithMeta,
} from "./handlers/index.js";

/**
 * Registers tag type routes on the Fastify instance.
 *
 * @remarks
 * - `GET /api/v1/tags/type` — fetch all tag types.
 * - `GET /api/v1/tags/type/:id` — fetch a single tag type by ID.
 * - `GET /api/v1/tags/type/:id/meta` — fetch a single tag type with metadata by ID. 🔒
 * - `POST /api/v1/tags/type` — create a tag type. 🔒
 * - `PATCH /api/v1/tags/type/:id` — partially update a tag type. 🔒
 * - `PUT /api/v1/tags/type/:id` — replace a tag type. 🔒
 * - `DELETE /api/v1/tags/type/:id` — delete a tag type by ID. 🔒
 *
 * @param server - The Fastify instance to register routes on.
 */
export default function tagTypeRoutes(server: FastifyInstance) {
  const protect = { preHandler: [server.authorize] };

  server.get("/api/v1/tags/type", replyHandler(server, fetchTagTypes));
  server.get("/api/v1/tags/type/:id", replyHandler(server, fetchTagType));
  server.get("/api/v1/tags/type/:id/meta", protect, replyHandler(server, fetchTagTypeWithMeta));
  server.post("/api/v1/tags/type", protect, replyHandler(server, createTagType));

  server.patch("/api/v1/tags/type/:id", protect, replyHandler(server, editTagType));
  server.put("/api/v1/tags/type/:id", protect, replyHandler(server, replaceTagType));

  server.delete("/api/v1/tags/type/:id", protect, replyHandler(server, deleteTagType));
}