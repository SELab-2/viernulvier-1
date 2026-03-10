import type { FastifyInstance } from "fastify";
import productionRoutes from "./productions.js";
import authRoutes from "./auth/auth.js";

/**
 * Registers all application routes on the Fastify instance.
 *
 * @param server - The Fastify instance to register routes on.
 */
export default async function registerRoutes(server: FastifyInstance) {
  await server.register(productionRoutes);
  await server.register(authRoutes);
}