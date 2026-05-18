import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

/**
 * authorize plugin without the database connection for the super variable
 * 
 * the super variable can instead be set by importing authorizeMock and setting authorizeMock.super
 */

export const authorizeMock = {
  super: false,
};

export default fp((server: FastifyInstance) => {
  server.decorate("authorize", (options: { super?: boolean } = {}) => async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();

      const payload = request.user as { id?: number, jti?: string };

      if (payload.jti && server.tokenDenylist.has(payload.jti)) {
        return reply.status(401).send({ error: "Token has been revoked" });
      }

      if (options.super && !authorizeMock.super) {
        return reply.status(403).send({ error: "Forbidden" });
      }
    } catch {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  });
});