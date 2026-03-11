import type { FastifyInstance } from "fastify";
import productionRoutes from "./production/production.js";
import authRoutes from "./auth/auth.js";
import hallRoutes from "./hall/hall.js";

/**
 * Registers all application routes on the Fastify instance.
 *
 * @param server - The Fastify instance to register routes on.
 */
export default async function registerRoutes(server: FastifyInstance) {
  await server.register(productionRoutes);
  await server.register(authRoutes);
  await server.register(hallRoutes);
}