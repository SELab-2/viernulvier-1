import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Hall, HallWithMeta } from "@viernulvier/shared/index.js";
import { HallSchema, serial} from "@viernulvier/shared/index.js";
import { parseParams, parseSchema, buildQuery } from "@/routes/helpers.js";
import z from "zod";


const HallSelect = `
SELECT
  id,
  old_id,
  address,
  name
FROM hall
`;

const fetchHallsQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `${HallSelect} ORDER BY id ASC`,
    HallSchema,
  );

const fetchHallByIdQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `${HallSelect} WHERE id = $1`,
    z.tuple([z.int()]),
    HallSchema,
  );

const fetchHallWithMetaByIdQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `SELECT id, old_id, address, name, created_at, updated_at, created_by, updated_by
     FROM hall WHERE id = $1`,
    z.tuple([z.int()]),
    HallSchema.withMeta(),
  );

const fetchHallByOldIdQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `${HallSelect} WHERE old_id = $1`,
    z.tuple([z.int()]),
    HallSchema,
  );

export const HallsListQuerySchema = z.object({
  old_id: serial().optional(),
});

/**
 * Internal helper to fetch a single hall by ID.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param id - The hall ID to fetch.
 * @returns The hall, or `null` if not found or parsing failed.
 */
export async function getHallById(
  server: FastifyInstance,
  id: number,
): Promise<Hall | null> {
  const rows = await fetchHallByIdQuery(server)(id);
  return rows[0] ?? null;
}

/**
 * Fetches a single hall by ID.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The hall, or `null` if not found or parsing failed.
 */
export async function fetchHall(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Hall | null> {
  const { id } = parseParams(request, z.object({ id: serial() }));
  return await getHallById(server, id);
}

/**
 * Fetches a single hall by ID, including metadata.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The hall with metadata, or `null` if not found or parsing failed.
 */
export async function fetchHallWithMeta(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<HallWithMeta | null> {
  const { id } = parseParams(request, z.object({ id: serial() }));
  const rows = await fetchHallWithMetaByIdQuery(server)(id);
  return rows[0] ?? null;
}

/**
 * Fetches all halls, optionally filtered by `old_id` query (legacy id).
 *
 * Invalid query values are rejected by {@link parseSchema} (same pattern as event list).
 */
export async function fetchHalls(server: FastifyInstance, request: FastifyRequest): Promise<Hall[]> {
  const { old_id } = parseSchema(server, HallsListQuerySchema, request.query);

  if (old_id !== undefined) {
    return await fetchHallByOldIdQuery(server)(old_id);
  }

  return await fetchHallsQuery(server)();
}
