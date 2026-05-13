import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { fetchAdminById } from "@/routes/auth/handlers/fetch.js";

/**
 * NOTE: when making changes on this plugin,
 * keep it in sync with the mock plugin:
 * backend/test/__mocks__/plugins/authorize.ts
 */

interface AuthorizeOptions {
  super?: boolean;
}

/**
 * Decorates the Fastify instance with an `authorize` hook that verifies the JWT session cookie or
 * `Authorization: Bearer <token>` header. Attach this as a `preHandler` on routes that require authentication.
 * Does a database query to fetch the corresponding admin.
 * Returns a `401` response if the token is missing, invalid (can also be due to the admin having been deleted), or has been revoked.
 * Returns a `403` response if `{ super: true }` is passed and the super field of the corresponding admin is false.
 *
 * @param server - The Fastify instance to decorate.
 */
export default fp(function authorizePlugin(server: FastifyInstance) {
  server.decorate("authorize", function (options: AuthorizeOptions = {}) {
    return async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();

        const payload = request.user as { id?: number, jti?: string };

        if (payload.jti && server.tokenDenylist.has(payload.jti)) {
          return await reply
            .status(401)
            .header("WWW-Authenticate", 'Bearer realm="api", error_description="Token has been revoked"')
            .send({ error: "Token has been revoked" });
        }

        if (payload.id === undefined) throw Error();

        const rows = await fetchAdminById(server)(payload.id!);

        if (rows.length == 0 || !rows[0]) throw Error();

        const admin = rows[0]!;

        if (options.super && !admin.super) {
          return await reply.status(403).send({ error: "Forbidden" });
        }
      } catch {
        return await reply
          .status(401)
          .header("WWW-Authenticate", 'Bearer realm="api"')
          .send({ error: "Unauthorized" });
      }
    };
  });
});

declare module "fastify" {
  interface FastifyInstance {
    authorize: (options?: AuthorizeOptions) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}