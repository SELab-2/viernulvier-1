import type { Admin, AdminWithMeta } from "@viernulvier/shared/index.js";
import { AdminSchema, stringToInt } from "@viernulvier/shared/index.js";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { buildQuery, parseParams, parseUser } from "@/routes/helpers.js";
import z from "zod";

const fetchAdminById = (server: FastifyInstance) =>
  buildQuery(
    server,
    `SELECT id, username, super, profile_picture_url AS profile_picture
     FROM admin WHERE id = $1`,
    z.tuple([z.int()]),
    AdminSchema,
  );

const fetchAdminWithMetaById = (server: FastifyInstance) =>
  buildQuery(
    server,
    `SELECT id, username, super, profile_picture_url AS profile_picture,
            created_at, updated_at, created_by, updated_by
     FROM admin WHERE id = $1`,
    z.tuple([z.int()]),
    AdminSchema.withMeta(),
  );

const fetchAllAdmins = (server: FastifyInstance) =>
  buildQuery(
    server,
    `SELECT id, username, super, profile_picture_url AS profile_picture
     FROM admin`,
    z.tuple([]),
    AdminSchema,
  );

/**
 * Fetches an admin by ID, without metadata.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The admin, or `null` if not found or parsing failed.
 */
async function fetchAdmin(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Admin | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const rows = await fetchAdminById(server)(id);
  return rows[0] ?? null;
}

/**
 * Fetches an admin by ID, including metadata.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The admin with metadata, or `null` if not found or parsing failed.
 */
async function fetchAdminWithMeta(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<AdminWithMeta | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const rows = await fetchAdminWithMetaById(server)(id);
  return rows[0] ?? null;
}

/**
 * Fetches the currently authenticated admin from the database, without metadata.
 * The admin's `id` is extracted from the JWT payload.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain a verified JWT payload with an `id` claim.
 * @returns The authenticated admin, or `null` if not found.
 */
async function fetchCurrentlyLoggedInAdmin(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Admin | null> {
  const { id } = parseUser(request);
  const rows = await fetchAdminById(server)(id);
  return rows[0] ?? null;
}

/**
 * Fetches the currently authenticated admin from the database, including metadata.
 * The admin's `id` is extracted from the JWT payload.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain a verified JWT payload with an `id` claim.
 * @returns The authenticated admin with metadata, or `null` if not found.
 */
async function fetchCurrentlyLoggedInAdminWithMeta(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<AdminWithMeta | null> {
  const { id } = parseUser(request);
  const rows = await fetchAdminWithMetaById(server)(id);
  return rows[0] ?? null;
}

/**
 * Fetches all admins from the database, without metadata.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param _request - The Fastify request, not used.
 * @returns An array of all admins, or an empty array if none are found.
 */
async function fetchAdmins(
  server: FastifyInstance,
  _request: FastifyRequest,
): Promise<Admin[]> {
  return await fetchAllAdmins(server)();
}

export { fetchAdmin, fetchAdminWithMeta, fetchCurrentlyLoggedInAdmin, fetchCurrentlyLoggedInAdminWithMeta, fetchAdmins };