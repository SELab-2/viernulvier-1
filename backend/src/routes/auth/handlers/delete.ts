import type { Admin } from "@viernulvier/shared/index.js";
import { AdminSchema, stringToInt } from "@viernulvier/shared/index.js";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { buildQuery, parseParams } from "@/routes/helpers.js";
import z from "zod";

const deleteAdminById = (server: FastifyInstance) =>
  buildQuery(
    server,
    `DELETE FROM admin WHERE id = $1
     RETURNING id, username, profile_picture_url AS profile_picture`,
    z.tuple([z.int()]),
    AdminSchema,
  );

/**
 * Deletes an admin by ID and returns the deleted record.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The deleted admin, or `null` if not found or parsing failed.
 */
export async function deleteAdmin(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Admin | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const rows = await deleteAdminById(server)(id);
  return rows[0] ?? null;
}