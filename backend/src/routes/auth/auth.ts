import type { FastifyInstance } from "fastify";
import { fetchAdmin, fetchAdminWithMeta } from "./fetch.js";
import { fetchHandler } from "@/routes/helpers.js";

export default function authRoutes(server: FastifyInstance) {
  server.get("/api/v1/auth/:id", fetchHandler(server, fetchAdmin));
  server.get("/api/v1/auth/:id/meta", fetchHandler(server, fetchAdminWithMeta));
};
