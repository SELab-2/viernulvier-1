import type { FastifyInstance } from "fastify";
import { replyHandler } from "@/routes/helpers.js";

import {
  fetchTag,
  fetchTags,
  createTag,
  editTag,
  deleteTag,
} from "./handlers/tag/index.js";

/**
 * Registers tag routes.
 *
 * GET    /api/v1/tag
 * GET    /api/v1/tag/:id
 * POST   /api/v1/tag
 * PATCH  /api/v1/tag/:id
 * DELETE /api/v1/tag/:id
 */
export default function tagRoutes(server: FastifyInstance) {
  server.get("/api/v1/tag", replyHandler(server, fetchTags));
  server.get("/api/v1/tag/:id", replyHandler(server, fetchTag));
  server.post("/api/v1/tag", replyHandler(server, createTag));
  server.patch("/api/v1/tag/:id", replyHandler(server, editTag));
  server.delete("/api/v1/tag/:id", replyHandler(server, deleteTag));
}
