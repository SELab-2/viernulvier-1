import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AdminSchema } from "@viernulvier/shared/index.js";
import { buildQuery, parseSchema, HttpError } from "@/routes/helpers.js";
import { z } from "zod";
import { comparePassword } from "./hash.js";

const LoginBodySchema = AdminSchema.pick({ username: true }).extend({
  password: z.string(),
});

const LoginRowSchema = z.object({
  id: z.int().nonnegative(),
  password: z.string(),
});

const fetchAdminCredentials = (server: FastifyInstance) =>
  buildQuery(
    server,
    `SELECT id, password FROM admin WHERE username = $1`,
    z.tuple([z.string()]),
    LoginRowSchema,
  );

// A pre-computed bcrypt hash used as a dummy target
const DUMMY_HASH = "$2b$12$invalidhashvaluethatwillnevermatchangything";

/**
 * Authenticates an admin by username and password and sets a session cookie.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `username` and `password` in its body.
 * @param reply - The Fastify reply, used to set the session cookie.
 * @returns An object indicating success.
 * @throws `HttpError` With status 401 if the username is not found or the password is incorrect.
 */
export async function login(server: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const { username, password } = parseSchema(server, LoginBodySchema, request.body);

  const rows = await fetchAdminCredentials(server)(username);

  // always compare hash to prevent a timing attack
  const valid = await comparePassword(password, rows[0]?.password ?? DUMMY_HASH);
  if (!valid) throw new HttpError(401, "Invalid credentials");

  const token = server.jwt.sign(
    { id: rows[0]!.id, username },
    { expiresIn: "24h" },
  );

  reply.setCookie("session", token, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "strict",
    path: "/",
  });

  return { succes: true };
}