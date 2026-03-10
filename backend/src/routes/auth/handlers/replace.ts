import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Admin } from "@viernulvier/shared/index.js";
import { AdminSchema, stringToInt } from "@viernulvier/shared/index.js";
import { buildQuery, getMetadata, parseParams, parseSchema } from "@/routes/helpers.js";
import { z } from "zod";
import { hashPassword } from "./hash.js";

const ReplaceAdminBodySchema = AdminSchema.pick({ username: true }).extend({
  password: z.string().min(8).max(72),
});

const replaceAdminById = (server: FastifyInstance) =>
  buildQuery(
    server,
    `UPDATE admin SET username = $1, password = $2, updated_by = $3, updated_at = $4
     WHERE id = $5
     RETURNING id, username, profile_picture_url AS profile_picture`,
    z.tuple([z.string(), z.string(), z.int(), z.date(), z.int()]),
    AdminSchema,
  );

/**
 * Replaces an existing admin's data and returns the updated record.
 * Unlike `editAdmin`, all fields are required and will be overwritten.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `username` and `password` in its body.
 * @returns The updated admin, or `null` if the update failed or parsing failed.
 */
export async function replaceAdmin(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Admin | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const body = parseSchema(server, ReplaceAdminBodySchema, request.body);
  const { admin, current_time } = getMetadata(request);
  const hashedPassword = await hashPassword(body.password);

  const rows = await replaceAdminById(server)(
    body.username,
    hashedPassword,
    admin,
    current_time,
    id,
  );
  return rows[0] ?? null;
}