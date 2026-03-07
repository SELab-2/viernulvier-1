import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";

/**
 * Registers JWT and cookie plugins on the Fastify instance.
 * The JWT secret is read from the `JWT_SECRET` environment variable.
 * Sessions are stored in an `httpOnly` cookie named `session`.
 *
 * @param server - The Fastify instance to register the plugins on.
 */
export default fp(async function jwtPlugin(server: FastifyInstance) {
  await server.register(fastifyCookie);

  await server.register(fastifyJwt, {
    secret: process.env["JWT_SECRET"]!,
    cookie: {
      cookieName: "session",
      signed: false,
    },
  });
});