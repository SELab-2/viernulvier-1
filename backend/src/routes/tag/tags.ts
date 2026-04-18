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
 * - `GET /api/v1/tag/all` — fetch tags (optional `production`, or `old_id` + `tag_type` together); includes non-public tags. 🔒
 * - `GET /api/v1/tag` — fetch public tags only (same query parameters as `GET /api/v1/tag/all`).
 * - `GET /api/v1/tag/:id/all` — fetch a single tag by ID (non-public allowed). 🔒
 * - `GET /api/v1/tag/:id` — fetch a single public tag by ID.
 * - `GET /api/v1/tag/:id/meta` — fetch a single tag with metadata by ID. 🔒
 * - `POST /api/v1/tag` — create a tag. 🔒
 * - `PUT /api/v1/tag/:id` — replace a tag. 🔒
 * - `PATCH /api/v1/tag/:id` — partially update a tag. 🔒
 * - `DELETE /api/v1/tag/:id` — delete a tag by ID. 🔒
 *
 * @param server - The Fastify instance to register routes on.
 */
export default function tagRoutes(server: FastifyInstance) {
  const protect = { preHandler: [server.authorize()] };

  server.get("/api/v1/tag/all", protect, replyHandler(server, fetchTags));
  server.get("/api/v1/tag", replyHandler(server, fetchTagsVisible));
  server.get("/api/v1/tag/:id/all", protect, replyHandler(server, fetchTag));
  server.get("/api/v1/tag/:id", replyHandler(server, fetchTagVisible));
  server.get("/api/v1/tag/:id/meta", protect, replyHandler(server, fetchTagWithMeta));
  server.post("/api/v1/tag", protect, replyHandler(server, createTag));

  server.put("/api/v1/tag/:id", protect, replyHandler(server, replaceTag));
  server.patch("/api/v1/tag/:id", protect, replyHandler(server, editTag));
  
  server.delete("/api/v1/tag/:id", protect, replyHandler(server, deleteTag));
}