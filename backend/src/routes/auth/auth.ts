import type { FastifyInstance } from "fastify";
import { fetchAdmin } from "./fetch.js";

export default function authRoutes(server: FastifyInstance) {
  server.get("/api/v1/auth/:id", async (request, reply) => {
    const admin = await fetchAdmin(server, request);
    if (!admin) return reply.status(404).send({ error: "Admin not found" });
    return admin;
  });
};
