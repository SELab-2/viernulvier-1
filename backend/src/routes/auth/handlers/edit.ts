import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Admin } from "@viernulvier/shared/index.js";
import { AdminSchema, stringToInt } from "@viernulvier/shared/index.js";
import { getMetadata, parseParams, parseSchema, ParseContext, NO_CONTENT } from "@/routes/helpers.js";
import z from "zod";
import { hashPassword } from "./hash.js";
import { checkCredentials } from "./login.js";

const zPassword = z.string().min(8).max(72);

const EditAdminBodySchema = AdminSchema.pick({ username: true, super: true }).extend({ password: zPassword }).partial();

const EditOwnPasswordSchema = z.object({
  oldPassword: zPassword,
  newPassword: zPassword,
});

/**
 * Updates an existing admin and returns the updated record.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain a partial body with `username`, `password`, and/or `super`.
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

  if (body.super !== undefined) {
    fields.push(`super = $${i++}`);
    values.push(body.super);
  }

  fields.push(`updated_by = $${i++}`, `updated_at = $${i++}`);
  values.push(admin, current_time, id);

  const result = await server.pg.query(
    `UPDATE admin SET ${fields.join(", ")} WHERE id = $${i}
     RETURNING id, username, super, profile_picture_url AS profile_picture`,
    values,
  );

  return parseSchema(server, z.array(AdminSchema), result.rows, ParseContext.Database)[0] ?? null;
}

/**
 * Edits the current logged in admin's password and returns an empty 204 No Content.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain a body with `oldPassword` and `newPassword`.
 * @returns NO_CONTENT to send a 204 No Content response.
 * @throws `HttpError` With status 401 if the old password is incorrect.
 */
export async function editOwnPassword(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<typeof NO_CONTENT> {
  const body = parseSchema(server, EditOwnPasswordSchema, request.body);
  const { admin } = getMetadata(request);

  // check if old password matches
  await checkCredentials(server, { id: admin }, body.oldPassword);

  // update with new password
  const hashedPassword = await hashPassword(body.newPassword);

  // note: I won't update the updated by, since it doesn't change anything to the admin schema or any of the fields visible in the CMS.

  await server.pg.query(
    `UPDATE admin SET password = $1 WHERE id = $2`,
    [hashedPassword, admin],
  );

  return NO_CONTENT;
}