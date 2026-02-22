import Fastify from "fastify";
import dbPlugin from "./db/postgres.js";
import productionRoutes from "./routes/productions.js";

import "dotenv/config";

const fastify = Fastify({
  logger: {
    enabled: true,
  },

});

async function start() {
  try {
    // Register plugins
    await fastify.register(dbPlugin);
    await fastify.pg.query("SELECT 1");
    fastify.log.info("DB connection successful");
    // Register routes
    await fastify.register(productionRoutes);

    await fastify.listen({
      port: Number(process.env["BACKEND_PORT"]) || 3000,
      host: "0.0.0.0",
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }

}

start();