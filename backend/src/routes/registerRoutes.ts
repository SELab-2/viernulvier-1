import type { FastifyInstance } from "fastify";
import productionRoutes from "./productions.js";
import tagRoutes from "./tag/tags.js";
import tagTypeRoutes from "./tag_type/tag_types.js";

/**
 * Registers all application routes on the Fastify instance.
 */
export default async function registerRoutes(server: FastifyInstance) {
  await server.register(productionRoutes);

  await server.register(tagRoutes);

  await server.register(tagTypeRoutes);
}