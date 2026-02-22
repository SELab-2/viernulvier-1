import fp from "fastify-plugin";
import pg from "@fastify/postgres";

export default fp(async (server) => {
  server.log.info("Registering Postgres connection...");

  await server.register(pg, {
    connectionString: process.env["DATABASE_URL"],
    max: 30,
    maxLifetimeSeconds: 5000,
  });
  server.log.info("Postgres plugin registered");
});