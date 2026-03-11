import type { FastifyInstance } from "fastify";
import productionRoutes from "./productions.js";
import authRoutes from "./auth/auth.js";
import eventRoutes from "./event/event.js";
import eventPriceRoutes from "./event_price/event_pice.js";

/**
 * Registers all application routes on the Fastify instance.
 *
 * @param server - The Fastify instance to register routes on.
 */
export default async function registerRoutes(server: FastifyInstance) {
  await server.register(productionRoutes);
  await server.register(authRoutes);
  await server.register(eventRoutes);
  await server.register(eventPriceRoutes);
}