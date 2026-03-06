import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Admin } from "@viernulvier/shared/index.js";
import { AdminSchema } from "@viernulvier/shared/index.js";
import { parseFirstRow, safeParse } from "@/routes/helpers.js";
import { z } from "zod";
import { hashPassword } from "./hash.js";

const CreateAdminBodySchema = AdminSchema.pick({ username: true }).extend({
  password: z.string().min(8).max(72),
});

/**
 * Creates a new admin and returns the created record.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `username` and `password` in its body.
 * @returns The created admin, or `null` if the insert failed or parsing failed.
 */
export async function createAdmin(server: FastifyInstance, request: FastifyRequest): Promise<Admin | null> {
  const body = safeParse(server, CreateAdminBodySchema, request.body);
  if (!body) return null;

  const { admin, current_time } = {admin: 0, current_time: 0};
  const hashedPassword = await hashPassword(body.password);

  const result = await server.pg.query<Admin>(
    `INSERT INTO admin (username, password, created_at, updated_at, created_by, updated_by)
     VALUES ($1, $2, $3, $3, $4, $4)
     RETURNING id, username, profile_picture_url AS profile_picture`,
    [body.username, hashedPassword, current_time, admin]
  );

  return parseFirstRow(server, AdminSchema, result.rows);
}