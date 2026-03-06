import type { Admin } from "@viernulvier/shared/index.js";
import { AdminSchema } from "@viernulvier/shared/index.js";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { getParam, parseFirstRow } from "@/routes/helpers.js";

/**
 * Deletes an admin by ID and returns the deleted record.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The deleted admin, or `null` if not found or parsing failed.
 */
export async function deleteAdmin(server: FastifyInstance, request: FastifyRequest): Promise<Admin | null> {
  const result = await server.pg.query<Admin>(
    `DELETE FROM admin WHERE id = $1
     RETURNING id, username, profile_picture_url AS profile_picture`,
    [getParam(request, "id")]
  );

  return parseFirstRow(server, AdminSchema, result.rows);
}