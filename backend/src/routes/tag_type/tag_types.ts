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

export default function tagTypeRoutes(server: FastifyInstance) {
  const protect = { preHandler: [server.authorize()] };

  server.get("/api/v1/tags/type", replyHandler(server, fetchTagTypes));
  server.get("/api/v1/tags/type/:id", replyHandler(server, fetchTagType));
  server.get("/api/v1/tags/type/:id/meta",protect, replyHandler(server, fetchTagTypeWithMeta));
  server.post("/api/v1/tags/type", protect, replyHandler(server, createTagType));

  server.patch("/api/v1/tags/type/:id", protect, replyHandler(server, editTagType));
  server.put("/api/v1/tags/type/:id", protect, replyHandler(server, replaceTagType));

  server.delete("/api/v1/tags/type/:id", protect, replyHandler(server, deleteTagType));
}