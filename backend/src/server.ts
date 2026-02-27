import Fastify, { type FastifyInstance } from "fastify";
import dbPlugin from "./db/postgres.js";
import productionRoutes from "./routes/productions.js";

import "dotenv/config";

/**
 * Creates a server instance and registers the standard plugins.
 * This allows us to start the server in a mock environment to be used in tests.
 *
 * @returns Server instance with all standard plugins registered.
 *
 * @internal
 */
export async function buildServer(): Promise<FastifyInstance> {
  const server = createServer();
  await registerPlugins(server);
  return server;
}

/**
 * Create a server instance.
 * 
 * @returns Server instance.
 */
function createServer(): FastifyInstance {
  const isDebug = process.env["DEBUG"]?.toLowerCase() === "true";

  return Fastify({
    logger: isDebug ? { level: "debug" } : false,
  });
}

/**
 * Registers all standard plugins.
 * 
 * @param server The server instance on which the plugins are registered.
 */
async function registerPlugins(server: FastifyInstance) {
  await server.register(dbPlugin);
  await server.register(productionRoutes);
}

/**
 * Starts the fastify server on a port defined by our environmental variables
 * 
 * @internal
 */
export async function start(): Promise<FastifyInstance> {
  const server = createServer();
  
  try {
    server.log.info("Registering plugins...");
    await registerPlugins(server);

    server.log.info("Starting up HTTP server...");
    await server.listen({
      port: Number(process.env["BACKEND_PORT"]) || 3000,
      host: "0.0.0.0",
    });
  } catch (err) {
    server.log.error(err);
  }

  return server;
}

// Ensures that the server is only started if this is the entry point for our app.
// Allows this file to be imported by other modules.
if (process.argv[1]?.includes("server.ts")) {
  await start();
}
