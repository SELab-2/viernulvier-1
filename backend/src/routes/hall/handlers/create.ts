import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Hall } from "@viernulvier/shared/index.js";
import { HallSchema } from "@viernulvier/shared/index.js";
import { getMetadata, parseSchema, buildQuery } from "@/routes/helpers.js";
import { z } from "zod";
import { languageMap } from "@viernulvier/shared/types/helpers.js";

const CreateHallBodySchema = HallSchema.omit({ id: true });

const insertHall = (server: FastifyInstance) =>
  buildQuery(
    server,
    `INSERT INTO hall (name, address, created_by, updated_by, created_at, updated_at)
     VALUES ($1, $2, $3, $3, $4, $4)
     RETURNING id, name, address`,
    z.tuple([
      z.int().nonnegative().nullable(), // old_id
      languageMap,            // name
      z.string(),             // address
      z.int(),       // admin
      z.date(),               // current_time
    ]),
    HallSchema,
  );

/**
 * Creates a new hall and returns the created hall.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain a hall body.
 * @returns The created hall, or `null` if the insert failed or parsing failed.
 */
export async function createHall(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Hall | null> {
  const body = parseSchema(server, CreateHallBodySchema, request.body);
  const { admin, current_time } = getMetadata(request);

  const rows = await insertHall(server)(
    body["old_id"],
    body["name"],
    body["address"],
    admin,
    current_time,
  );

  return rows[0] ?? null;
}
