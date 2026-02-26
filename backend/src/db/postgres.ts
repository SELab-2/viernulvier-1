import fp from "fastify-plugin";
import pg from "@fastify/postgres";

/**
 *  Creates a fastify plugin that sets up the connection to our environment variables.
 *  @see {@link server.ts | server init module} to see how this is used.
 *
 *  @internal
 */
export default fp(async (server) => {
  server.log.info("Registering Postgres connection...");

  await server.register(pg, {
    connectionString: process.env["DATABASE_URL"],
    max: 30,
    maxLifetimeSeconds: 5000,
  });
  server.log.info("Postgres plugin registered");
});
