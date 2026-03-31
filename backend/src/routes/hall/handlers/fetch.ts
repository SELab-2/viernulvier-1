import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Hall, HallWithMeta } from "@viernulvier/shared/index.js";
import { HallSchema, stringToInt } from "@viernulvier/shared/index.js";
import { parseParams, buildQuery } from "@/routes/helpers.js";
import z from "zod";
import { request } from "https";

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


/**
 * Internal helper to fetch a single hall by ID.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param id - The hall ID to fetch.
 * @returns The hall, or `null` if not found or parsing failed.
 */
export async function getHallById(server: FastifyInstance, id: number): Promise<Hall | null> {
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
export async function fetchHall(server: FastifyInstance, request: FastifyRequest): Promise<Hall | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
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
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const rows = await fetchHallWithMetaByIdQuery(server)(id);
  return rows[0] ?? null;
}

/**
 * Fetches a list of halls.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param _request - The Fastify request.
 * @returns The list of halls, or `null` if parsing failed.
 */
export async function fetchHalls(server: FastifyInstance, request: FastifyRequest): Promise<Hall[] | null> {
  const { old_id } = request.query as { old_id?: string };

  if (old_id) {
    return await fetchHallByOldIdQuery(server)(parseInt(old_id, 10));
  } 
  
  return await fetchHallsQuery(server)();
}
