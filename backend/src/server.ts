import Fastify from "fastify";
import dbPlugin from "./db/postgres.js";
import productionRoutes from "./routes/productions.js";

import "dotenv/config";

const isDebug = process.env["DEBUG"]?.toLowerCase() === "true";

export const server = Fastify({
  logger: isDebug
    ? {
        level: "debug",
      }
    : false,
});

/**
 * This function is used to build te server before it is then starten. This allows us to
 * start the server in a mock environment to be used in tests.
 *
 * @returns Server instance with all standaard plugins registered
 *
 * @internal
 */
export async function buildServer() {
  await server.register(dbPlugin);
  await server.register(productionRoutes);

  return await server;
}
/**
 * Starts the fastify server on a port defined by our environmental variables
 */
async function start() {
  try {
    server.log.info("Building Server...");
    await buildServer();

    server.log.info("Starting up HTTP server...");
    await server.listen({
      port: Number(process.env["BACKEND_PORT"]) || 3000,
      host: "0.0.0.0",
    });
  } catch (err) {
    server.log.error(err);
  }
}

// Ensures that the server is only started if this is the entry point for our app.
// Allows this file to be imported by other modules.
if (process.argv[1]?.includes("server.ts")) {
  await start();
}
