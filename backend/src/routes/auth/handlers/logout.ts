import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/**
 * Logs out the current admin by revoking the session token and clearing the session cookie.
 * The token's `jti` claim is added to the server denylist, rejecting any further requests made with it
 * until it naturally expires. Works for both cookie-based and `Authorization` header-based sessions.
 *
 * @param server - The Fastify instance, used to access the token denylist.
 * @param request - The Fastify request, used to extract and verify the session token.
 * @param reply - The Fastify reply, used to clear the session cookie.
 * @returns An object indicating success.
 */
export async function logout(
  server: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const payload = request.user as { jti?: string; exp?: number };

  if (payload.jti) {
    server.tokenDenylist.add(payload.jti);

    if (payload.exp) {
      const msUntilExpiry = payload.exp * 1000 - Date.now();
      setTimeout(() => server.tokenDenylist.delete(payload.jti!), msUntilExpiry);
    }
  }

  reply.clearCookie("session", { path: "/" });
  return { success: true };
}