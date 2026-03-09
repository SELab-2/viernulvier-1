import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Hall } from "@viernulvier/shared/index.js";
import { HallSchema } from "@viernulvier/shared/index.js";
import { getMetadata, parseSchema, parseFirstRow } from "@/routes/helpers.js";

const CreateHallBodySchema = HallSchema.omit({ id: true });

/**
 * Creates a new hall and returns the created hall.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain a hall body.
 * @returns The created hall, or `null` if the insert failed or parsing failed.
 */
export async function createHall(server: FastifyInstance, request: FastifyRequest): Promise<Hall | null> {
  const body = parseSchema(server, CreateHallBodySchema, request.body);
  const { admin, current_time } = getMetadata(request);

  const insertResult = await server.pg.query<Hall>(
    `INSERT INTO hall (name, address, vendor_id, created_by, updated_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $4, $5, $5)
     RETURNING id, name, address, vendor_id`,
    [body["name"], body["address"], body["vendor_id"], admin, current_time]
  );

  return parseFirstRow(server, HallSchema, insertResult.rows);
}
