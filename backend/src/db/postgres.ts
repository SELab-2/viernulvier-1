import fp from "fastify-plugin";
import pg from "@fastify/postgres";

export default fp(async (fastify) => {
  fastify.register(pg, {
    connectionString: process.env["DATABASE_URL"],
    max: 30,
    maxLifetimeSeconds: 5000,
  });
});