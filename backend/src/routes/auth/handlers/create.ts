import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Admin } from "@viernulvier/shared/index.js";
import { AdminSchema } from "@viernulvier/shared/index.js";
import { getMetadata, parseSchema, buildQuery } from "@/routes/helpers.js";
import { z } from "zod";
import { hashPassword } from "./hash.js";

const CreateAdminBodySchema = AdminSchema.pick({ username: true, super: true }).extend({
  password: z.string().min(8).max(72),
});

const insertAdmin = (server: FastifyInstance) =>
  buildQuery(
    server,
    `INSERT INTO admin (username, password, super, created_by, updated_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $4, $5, $5)
     RETURNING id, username, super, profile_picture_url AS profile_picture`,
    z.tuple([z.string(), z.string(), z.boolean(), z.number().int(), z.date()]),
    AdminSchema,
  );

/**
 * Creates a new admin and returns the created record.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `username` and `password` in its body.
 * @returns The created admin, or `null` if the insert failed or parsing failed.
 */
export async function createAdmin(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Admin | null> {
  const body = parseSchema(server, CreateAdminBodySchema, request.body);
  const { admin, current_time } = getMetadata(request);
  const hashedPassword = await hashPassword(body.password);

  const rows = await insertAdmin(server)(
    body.username,
    hashedPassword,
    body.super,
    admin,
    current_time,
  );

  return rows[0] ?? null;
}