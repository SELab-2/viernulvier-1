import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

interface AuthorizeOptions {
  super?: boolean;
}

/**
 * Decorates the Fastify instance with an `authorize` hook that verifies the JWT session cookie or
 * `Authorization: Bearer <token>` header. Attach this as a `preHandler` on routes that require authentication.
 * Returns a `401` response if the token is missing, invalid, or has been revoked.
 * Returns a `403` response if `{ super: true }` is passed and the token's `super` claim is not true.
 *
 * @param server - The Fastify instance to decorate.
 */
export default fp(function authorizePlugin(server: FastifyInstance) {
  server.decorate("authorize", function (options: AuthorizeOptions = {}) {
    return async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();

        const payload = request.user as { jti?: string; super?: boolean };

        if (payload.jti && server.tokenDenylist.has(payload.jti)) {
          return await reply.status(401).send({ error: "Token has been revoked" });
        }

        if (options.super && !payload.super) {
          return await reply.status(403).send({ error: "Forbidden" });
        }
      } catch {
        reply.status(401).send({ error: "Unauthorized" });
      }
    };
  });
});

declare module "fastify" {
  interface FastifyInstance {
    authorize: (options?: AuthorizeOptions) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}