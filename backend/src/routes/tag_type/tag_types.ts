import type { FastifyInstance } from "fastify";
import { replyHandler } from "@/routes/helpers.js";

import {
  fetchTagType,
  fetchTagTypes,
  createTagType,
  editTagType,
  deleteTagType,
} from "./handlers/index.js";

export default function tagTypeRoutes(server: FastifyInstance) {
  server.get("/api/v1/tag-type", replyHandler(server, fetchTagTypes));
  server.get("/api/v1/tag-type/:id", replyHandler(server, fetchTagType));
  server.post("/api/v1/tag-type", replyHandler(server, createTagType));
  server.patch("/api/v1/tag-type/:id", replyHandler(server, editTagType));
  server.delete("/api/v1/tag-type/:id", replyHandler(server, deleteTagType));
}