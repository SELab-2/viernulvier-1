import type { FastifyInstance } from "fastify";
import { replyHandler } from "@/routes/helpers.js";

import {
  fetchTag,
  fetchTags,
  createTag,
  editTag,
  deleteTag,
  replaceTag,
  fetchTagWithMeta,
  fetchTagVisible,
  fetchTagsVisible,
} from "./handlers/index.js";

/**
 * Registers tag routes on the Fastify instance.
 *
 * @remarks
 * - `GET /api/v1/tags/all` — fetch tags (optionally filtered by production); includes non-public tags. 🔒
 * - `GET /api/v1/tags` — fetch public tags only (same query params as `/all`).
 * - `GET /api/v1/tags/:id/all` — fetch a single tag by ID (non-public allowed). 🔒
 * - `GET /api/v1/tags/:id` — fetch a single public tag by ID.
 * - `GET /api/v1/tags/:id/meta` — fetch a single tag with metadata by ID. 🔒
 * - `POST /api/v1/tags` — create a tag. 🔒
 * - `PUT /api/v1/tags/:id` — replace a tag. 🔒
 * - `PATCH /api/v1/tags/:id` — partially update a tag. 🔒
 * - `DELETE /api/v1/tags/:id` — delete a tag by ID. 🔒
 *
 * @param server - The Fastify instance to register routes on.
 */
export default function tagRoutes(server: FastifyInstance) {
  const protect = { preHandler: [server.authorize] };

  server.get("/api/v1/tags/all", protect, replyHandler(server, fetchTags));
  server.get("/api/v1/tags", replyHandler(server, fetchTagsVisible));
  server.get("/api/v1/tags/:id/all", protect, replyHandler(server, fetchTag));
  server.get("/api/v1/tags/:id", replyHandler(server, fetchTagVisible));
  server.get("/api/v1/tags/:id/meta", protect, replyHandler(server, fetchTagWithMeta));
  server.post("/api/v1/tags", protect, replyHandler(server, createTag));

  server.put("/api/v1/tags/:id", protect, replyHandler(server, replaceTag));
  server.patch("/api/v1/tags/:id", protect, replyHandler(server, editTag));
  
  server.delete("/api/v1/tags/:id", protect, replyHandler(server, deleteTag));
}