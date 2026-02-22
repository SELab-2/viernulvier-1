import Fastify from "fastify";
import dbPlugin from "./db/postgres.js";
import productionRoutes from "./routes/productions.js";

import "dotenv/config";

const server = Fastify({
  logger: {
    enabled: true,
  },

});

async function start() {
  try {
    // Register plugins
    await server.register(dbPlugin);
    await server.pg.query("SELECT 1");
    server.log.info("DB connection successful");
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