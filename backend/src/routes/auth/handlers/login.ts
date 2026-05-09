import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AdminSchema } from "@viernulvier/shared/index.js";
import { buildQuery, parseSchema, HttpError } from "@/routes/helpers.js";
import { z } from "zod";
import { comparePassword } from "./hash.js";

const LoginBodySchema = AdminSchema.pick({ username: true }).extend({
  password: z.string(),
});

const LoginRowSchema = AdminSchema.pick({ id: true, super: true }).extend({
  password: z.string(),
});

/**
 * Authenticates an admin by username and password, sets a session cookie, and returns a signed JWT.
 * The token contains the admin's `id`, `username`, `super`, and a unique `jti` claim used for revocation on logout.
 * Clients that cannot use cookies should store the returned token and pass it via the `Authorization: Bearer <token>` header.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `username` and `password` in its body.
 * @param reply - The Fastify reply, used to set the session cookie.
 * @returns The signed JWT token.
 * @throws `HttpError` With status 401 if the username is not found or the password is incorrect.
 */
export async function login(
  server: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { username, password } = parseSchema(server, LoginBodySchema, request.body);

  const { id, super: superValue } = await checkCredentials(server, { username }, password);

  const token = server.jwt.sign(
    { id, username, super: superValue, jti: server.generateJti() },
    { expiresIn: "24h" },
  );

  reply.setCookie("session", token, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "strict",
    path: "/",
  });

  return { token };
}

type AdminIdentifier =
  | { username: string }
  | { id: number };

const fetchByUsername = (server: FastifyInstance) =>
  buildQuery(
    server,
    `SELECT id, password, super FROM admin WHERE username = $1`,
    z.tuple([z.string()]),
    LoginRowSchema,
  );

const fetchById = (server: FastifyInstance) =>
  buildQuery(
    server,
    `SELECT id, password, super FROM admin WHERE id = $1`,
    z.tuple([z.number()]),
    LoginRowSchema,
  );

// A pre-computed bcrypt hash used as a dummy target
const DUMMY_HASH = "$2b$12$invalidhashvaluethatwillnevermatchangything";

/**
 * Checks if the provided username and password match, throws an error if they don't.
 * 
 * @param server - The Fastify instance, used for database access.
 * @param username - The username of the admin.
 * @param password - The password to compare with.
 * @returns The result of the fetch query (object with id, (hashed) password and super)
 * @throws `HttpError` With status 401 if the username is not found or the password is incorrect.
 */
export async function checkCredentials(
  server: FastifyInstance,
  identifier: AdminIdentifier,
  password: string,
): Promise<{
  id: number;
  super: boolean;
  password: string;
}> {
  const rows = await (
    "username" in identifier
      ? fetchByUsername(server)(identifier.username)
      : fetchById(server)(identifier.id)
  );

  const valid = await comparePassword(password, rows[0]?.password ?? DUMMY_HASH);

  if (rows.length === 0 || !valid) {
    throw new HttpError(401, "Invalid credentials");
  }

  return rows[0]!;
}