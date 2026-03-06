import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Production } from "@viernulvier/shared/index.js";
import { ProductionSchema } from "@viernulvier/shared/index.js";
import { getParam, parseFirstRow, parse, ParseContext } from "@/routes/helpers.js";
import z from "zod";

const ProductionSelect = `
SELECT
  p.id,
  p.vendor_id,
  p.box_office_id,
  (SELECT COALESCE(ARRAY_AGG(e.id), '{}') FROM event e WHERE e.production = p.id) AS events,
  p.supertitle,
  p.title,
  p.artist,
  p.tagline,
  p.teaser,
  p.description,
  p.description_extra,
  p.description_2,
  p.video_1,
  p.video_2,
  p.quote,
  p.quote_source,
  p.programme,
  p.info,
  (SELECT COALESCE(ARRAY_AGG(pt.tag_id), '{}') FROM production_tag pt WHERE pt.production_id = p.id) AS tags
FROM production p
`;

/**
 * Internal helper to fetch a single production by ID.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param id - The production ID to fetch.
 * @returns The production, or `null` if not found or parsing failed.
 */
export async function getProductionById(server: FastifyInstance, id: string | number): Promise<Production | null> {
  const result = await server.pg.query<Production>(`${ProductionSelect} WHERE p.id = $1`, [id]);

  return parseFirstRow(server, ProductionSchema, result.rows);
}

/**
 * Fetches a single production by ID.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The production, or `null` if not found or parsing failed.
 */
export async function fetchProduction(server: FastifyInstance, request: FastifyRequest): Promise<Production | null> {
  const id = getParam(request, "id");
  return await getProductionById(server, id);
}

/**
 * Fetches a list of productions.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param _request - The Fastify request (currently unused, reserved for future filters).
 * @returns The list of productions, or `null` if parsing failed.
 */
export async function fetchProductions(server: FastifyInstance, _request: FastifyRequest): Promise<Production[] | null> {
  const result = await server.pg.query<Production>(`${ProductionSelect} ORDER BY p.id ASC`);

  return parse(server, z.array(ProductionSchema), result.rows, ParseContext.Database);
}

