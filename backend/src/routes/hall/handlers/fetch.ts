import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Hall, HallWithMeta } from "@viernulvier/shared/index.js";
import { HallSchema } from "@viernulvier/shared/index.js";
import { getParam, parseFirstRow, parse, ParseContext } from "@/routes/helpers.js";
import z from "zod";

const HallSelect = `
SELECT
  id,
  address,
  vendor_id,
  name
FROM hall
`;

/**
 * Internal helper to fetch a single hall by ID.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param id - The hall ID to fetch.
 * @returns The hall, or `null` if not found or parsing failed.
 */
export async function getHallById(server: FastifyInstance, id: string | number): Promise<Hall | null> {
  const result = await server.pg.query<Hall>(`${HallSelect} WHERE id = $1`, [id]);

  return parseFirstRow(server, HallSchema, result.rows);
}

/**
 * Fetches a single hall by ID.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The hall, or `null` if not found or parsing failed.
 */
export async function fetchHall(server: FastifyInstance, request: FastifyRequest): Promise<Hall | null> {
  const id = getParam(request, "id");
  return await getHallById(server, id);
}

/**
 * Fetches a single hall by ID, including metadata.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The hall with metadata, or `null` if not found or parsing failed.
 */
export async function fetchHallWithMeta(server: FastifyInstance, request: FastifyRequest): Promise<HallWithMeta | null> {
  const result = await server.pg.query<HallWithMeta>(
    `SELECT
      id,
      address,
      vendor_id,
      name,
      created_at,
      updated_at,
      created_by,
      updated_by
    FROM hall
    WHERE id = $1`,
    [getParam(request, "id")]
  );
  return parseFirstRow(server, HallSchema.withMeta(), result.rows);
}

/**
 * Fetches a list of halls.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param _request - The Fastify request (currently unused, reserved for future filters).
 * @returns The list of halls, or `null` if parsing failed.
 */
export async function fetchHalls(server: FastifyInstance, _request: FastifyRequest): Promise<Hall[] | null> {
  const result = await server.pg.query<Hall>(`${HallSelect} ORDER BY id ASC`);

  return parse(server, z.array(HallSchema), result.rows, ParseContext.Database);
}
