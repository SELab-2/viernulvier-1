import Fastify from "fastify";
import dbPlugin from "./db/postgres.js";
import productionRoutes from "./routes/productions.js";

import "dotenv/config";

const isDebug = process.env["DEBUG"]?.toLowerCase() === "true";

const server = Fastify({
  logger: isDebug
    ? {
        level: "debug",
      }
    : false,
});

async function start() {
  try {
    // Register plugins
    await server.register(dbPlugin);

    // Register routes
    await server.register(productionRoutes);

    await server.listen({
      port: Number(process.env["BACKEND_PORT"]) || 3000,
      host: "0.0.0.0",
    });
  } catch(err) {
    server.log.error(err)
  }
}

await start();