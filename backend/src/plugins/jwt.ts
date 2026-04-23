import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import { randomUUID } from "crypto";

const denylist = new Set<string>();

/**
 * Registers JWT and cookie plugins on the Fastify instance.
 * The JWT secret is read from the `JWT_SECRET` environment variable.
 * Sessions are stored in an `httpOnly` cookie named `session`.
 *
 * Also decorates the server with:
 * - `tokenDenylist` — a Set of revoked JWT IDs (`jti` claims) that are rejected on each request.
 * - `generateJti` — a function that generates a unique JWT ID for each token.
 *
 * @param server - The Fastify instance to register the plugins on.
 */
export default fp(async function jwtPlugin(server: FastifyInstance) {
  const jwtSecret = process.env["JWT_SECRET"];

  if (!jwtSecret) {
    throw new Error("JWT_SECRET environment variable is not defined");
  }

  await server.register(fastifyCookie);

  await server.register(fastifyJwt, {
    secret: jwtSecret,
    cookie: {
      cookieName: "session",
      signed: false,
    },
  });

  server.decorate("tokenDenylist", denylist);
  server.decorate("generateJti", () => randomUUID());
});

declare module "fastify" {
  interface FastifyInstance {
    tokenDenylist: Set<string>;
    generateJti: () => string;
  }
}