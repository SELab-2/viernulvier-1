import Fastify, { type FastifyInstance } from "fastify";
import dbPlugin from "./plugins/postgres.js";
import jwtPlugin from "./plugins/jwt.js";
import s3Plugin from "./plugins/s3.js";
import multipartPlugin from "./plugins/multipart.js";
import authorizePlugin from "./plugins/authorize.js";
import registerRoutes from "./routes/registerRoutes.js";

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
 * @param server - The server instance on which the plugins are registered.
 */
async function registerPlugins(server: FastifyInstance) {
  await server.register(dbPlugin);
  await server.register(jwtPlugin);
  await server.register(authorizePlugin);
  await server.register(s3Plugin);
  await server.register(multipartPlugin);
  await registerRoutes(server);
}

/**
 * Gets the port that the server will listen on.
 * 
 * @internal
 */
export function getPort() {
  return Number(process.env["BACKEND_PORT"] ?? "3000");
}

/**
 * Starts the fastify server on a port defined by our environmental variables;
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
      port: getPort(),
      host: "0.0.0.0",
    });
  } catch (err) {
    server.log.error(err);
    throw err;
  }

  return server;
}
