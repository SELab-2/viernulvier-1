import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Admin } from "@viernulvier/shared/index.js";
import { AdminSchema } from "@viernulvier/shared/index.js";
import { getMetadata, parseFirstRow, parse } from "@/routes/helpers.js";
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
  const body = parse(server, CreateAdminBodySchema, request.body);

  const { admin, current_time } = getMetadata(request);
  const hashedPassword = await hashPassword(body.password);

  const result = await server.pg.query<Admin>(
    `INSERT INTO admin (username, password, created_by, updated_by, created_at, updated_at)
     VALUES ($1, $2, $3, $3, $4, $4)
     RETURNING id, username, profile_picture_url AS profile_picture`,
    [body.username, hashedPassword, admin, current_time]
  );

  return parseFirstRow(server, AdminSchema, result.rows);
}