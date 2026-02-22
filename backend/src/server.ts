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

export async function buildServer() {
  await server.register(dbPlugin);
  await server.register(productionRoutes);

  return await server;
}

async function start() {
  try {
    server.log.info("Building Server...");
    await buildServer();

    server.log.info("Starting up HTTP server...")
    await server.listen({
      port: Number(process.env["BACKEND_PORT"]) || 3000,
      host: "0.0.0.0",
    });

  } catch (err) {
    server.log.error(err);
  }
}

if (process.argv[1]?.includes("server.ts")) {
  await start();
}