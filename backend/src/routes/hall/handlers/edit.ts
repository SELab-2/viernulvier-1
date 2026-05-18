import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Hall } from "@viernulvier/shared/index.js";
import { HallSchema, serial } from "@viernulvier/shared/index.js";
import { getMetadata, parseParams, parseSchema, HttpError, HttpClientError, ParseContext } from "@/routes/helpers.js";
import { z } from "zod";

export const EditHallBodySchema = HallSchema.omit({ id: true }).partial();

/**
 * Updates an existing hall and returns the updated record.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in params and a partial hall body.
 * @returns The updated hall, or `null` if the update failed or parsing failed.
 */
export async function editHall(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Hall | null> {
  const { id } = parseParams(request, z.object({ id: serial() }));
  const body = parseSchema(server, EditHallBodySchema, request.body);
  const { admin, current_time } = getMetadata(request);

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const addField = (column: string, value: unknown) => {
    if (value === undefined) return;
    fields.push(`${column} = $${i++}`);
    values.push(value);
  };

  addField("old_id", body["old_id"]);
  addField("name", body["name"]);
  addField("address", body["address"]);

  if (fields.length === 0) {
    throw new HttpError(HttpClientError.BadRequest, "No fields to update");
  }

  fields.push(`updated_by = $${i++}`, `updated_at = $${i++}`);
  values.push(admin, current_time, id);

  const result = await server.pg.query<Hall>(
    `UPDATE hall SET ${fields.join(", ")} WHERE id = $${i}
     RETURNING id, old_id, name, address`,
    values,
  );

  return parseSchema(server, z.array(HallSchema), result.rows, ParseContext.Database)[0] ?? null;

}