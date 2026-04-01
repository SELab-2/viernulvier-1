import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Admin } from "@viernulvier/shared/index.js";
import { AdminSchema, stringToInt } from "@viernulvier/shared/index.js";
import { getMetadata, parseParams, parseSchema, ParseContext } from "@/routes/helpers.js";
import z from "zod";
import { hashPassword } from "./hash.js";

const EditAdminBodySchema = AdminSchema.pick({ username: true }).extend({
  password: z.string().min(8).max(72),
}).partial();

/**
 * Updates an existing admin and returns the updated record.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `username` and/or `password` in its body.
 * @returns The updated admin, or `null` if the update failed or parsing failed.
 */
export async function editAdmin(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Admin | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const body = parseSchema(server, EditAdminBodySchema, request.body);
  const { admin, current_time } = getMetadata(request);

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (body.username !== undefined) {
    fields.push(`username = $${i++}`);
    values.push(body.username);
  }

  if (body.password !== undefined) {
    fields.push(`password = $${i++}`);
    values.push(await hashPassword(body.password));
  }

  fields.push(`updated_by = $${i++}`, `updated_at = $${i++}`);
  values.push(admin, current_time, id);

  const result = await server.pg.query(
    `UPDATE admin SET ${fields.join(", ")} WHERE id = $${i}
     RETURNING id, username, profile_picture_url AS profile_picture`,
    values,
  );

  return parseSchema(server, z.array(AdminSchema), result.rows, ParseContext.Database)[0] ?? null;
}