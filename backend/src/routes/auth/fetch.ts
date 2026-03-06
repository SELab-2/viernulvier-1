import type { Admin, AdminWithMeta } from "@viernulvier/shared/index.js";
import { AdminSchema } from "@viernulvier/shared/index.js";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { getParam, parseFirstRow } from "@/routes/helpers.js";

/**
 * Fetches an admin by ID, without metadata.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The admin, or `null` if not found or parsing failed.
 */
async function fetchAdmin(server: FastifyInstance, request: FastifyRequest): Promise<Admin | null> {
  const result = await server.pg.query<Admin>(
    `SELECT id, username, profile_picture_url AS profile_picture
     FROM admin WHERE id = $1`,
    [getParam(request, "id")]
  );

  return parseFirstRow(server, AdminSchema, result.rows);
}

/**
 * Fetches an admin by ID, including metadata.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The admin with metadata, or `null` if not found or parsing failed.
 */
async function fetchAdminWithMeta(server: FastifyInstance, request: FastifyRequest): Promise<AdminWithMeta | null> {
  const result = await server.pg.query<AdminWithMeta>(
    `SELECT id, username, profile_picture_url AS profile_picture,
            created_at, updated_at, created_by, updated_by
     FROM admin
     WHERE id = $1`,
    [getParam(request, "id")]
  );

  return parseFirstRow(server, AdminSchema.withMeta(), result.rows);
}

export { fetchAdmin, fetchAdminWithMeta };