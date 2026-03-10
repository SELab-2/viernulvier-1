import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/**
 * Logs out the current admin by clearing the session cookie.
 *
 * @param _server - Unused.
 * @param _request - Unused.
 * @param reply - The Fastify reply, used to clear the session cookie.
 * @returns An object indicating success.
 */
export async function logout(_server: FastifyInstance, _request: FastifyRequest, reply: FastifyReply) {
  reply.clearCookie("session", { path: "/" });
  return { success: true };
}