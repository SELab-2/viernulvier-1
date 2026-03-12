import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

/**
 * Decorates the Fastify instance with an `authorize` hook that verifies the JWT session cookie.
 * Attach this as a `preHandler` on routes that require authentication.
 * Returns a `401 Unauthorized` response if the token is missing or invalid.
 *
 * @param server - The Fastify instance to decorate.
 */
export default fp(function authorizePlugin(server: FastifyInstance) {
  server.decorate("authorize", async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ error: "Unauthorized" });
    }
  });
});

declare module "fastify" {
  interface FastifyInstance {
    authorize: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}