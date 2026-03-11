import type { FastifyInstance } from "fastify";
import { replyHandler } from "@/routes/helpers.js";

import {
  fetchTag,
  fetchTags,
  fetchTagsForProduction,
  createTag,
  editTag,
  deleteTag,
  replaceTag,
} from "./handlers/index.js";

export default function tagRoutes(server: FastifyInstance) {
  server.get("/api/v1/tag", replyHandler(server, fetchTags));
  server.get("/api/v1/tag/:id", replyHandler(server, fetchTag));
  server.get("/api/v1/tag/:id/productions", replyHandler(server, fetchTagsForProduction));
  server.post("/api/v1/tag", replyHandler(server, createTag));

  server.put("/api/v1/tag/:id", replyHandler(server, replaceTag));
  server.patch("/api/v1/tag/:id", replyHandler(server, editTag));
  
  server.delete("/api/v1/tag/:id", replyHandler(server, deleteTag));
}