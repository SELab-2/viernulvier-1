import type { FastifyInstance } from "fastify";
import { replyHandler } from "@/routes/helpers.js";

import {
  fetchTag,
  fetchTags,
  createTag,
  editTag,
  deleteTag,
  replaceTag,
} from "./handlers/index.js";

export default function tagRoutes(server: FastifyInstance) {
  server.get("/api/v1/tags", replyHandler(server, fetchTags));
  server.get("/api/v1/tags/:id", replyHandler(server, fetchTag));
  server.post("/api/v1/tags", replyHandler(server, createTag));

  server.put("/api/v1/tags/:id", replyHandler(server, replaceTag));
  server.patch("/api/v1/tags/:id", replyHandler(server, editTag));
  
  server.delete("/api/v1/tags/:id", replyHandler(server, deleteTag));
}