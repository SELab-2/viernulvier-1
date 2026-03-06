import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Admin } from "@viernulvier/shared/index.js";
import { AdminSchema } from "@viernulvier/shared/index.js";
import { getMetadata, getParam, parseFirstRow, safeParse } from "@/routes/helpers.js";
import { z } from "zod";
import { hashPassword } from "./hash.js";

const ReplaceAdminBodySchema = AdminSchema.pick({ username: true }).extend({
  password: z.string().min(8).max(72),
});

/**
 * Replaces an existing admin's data and returns the updated record.
 * Unlike `editAdmin`, all fields are required and will be overwritten.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `username` and `password` in its body.
 * @returns The updated admin, or `null` if the update failed or parsing failed.
 */
export async function replaceAdmin(server: FastifyInstance, request: FastifyRequest): Promise<Admin | null> {
  const id = getParam(request, "id");
  const body = safeParse(server, ReplaceAdminBodySchema, request.body);

  const { admin, current_time } = getMetadata();
  const hashedPassword = await hashPassword(body.password);

  const result = await server.pg.query<Admin>(
    `UPDATE admin SET username = $1, password = $2, updated_by = $3, updated_at = $4
     WHERE id = $5
     RETURNING id, username, profile_picture_url AS profile_picture`,
    [body.username, hashedPassword, admin, current_time, id]
  );

  return parseFirstRow(server, AdminSchema, result.rows);
}