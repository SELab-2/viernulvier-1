import type { FastifyInstance, FastifyRequest } from "fastify";
import type { QueryResult } from "pg";
import type {ProductionWithBackwardsRefs, ProductionWithMeta} from "@viernulvier/shared/index.js";
import {ProductionSchema, ProductionSchemaWithBackwardsRefs, stringToInt} from "@viernulvier/shared/index.js";
import { parseParams, parseSchema, ParseContext } from "@/routes/helpers.js";
import z from "zod";

const ProductionSelect = `
SELECT
  p.id,
  p.old_id,
  p.finalized,
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
  (SELECT COALESCE(ARRAY_AGG(pt.tag), '{}') FROM production_tag pt WHERE pt.production = p.id) AS tags
FROM production p
`;

/**
 * Internal helper to fetch a single production by ID.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param id - The production ID to fetch.
 * @returns The production, or `null` if not found or parsing failed.
 */
export async function getProductionById(
  server: FastifyInstance,
  id: string | number,
): Promise<ProductionWithBackwardsRefs | null> {
  const result = await server.pg.query<ProductionWithBackwardsRefs>(
    `${ProductionSelect} WHERE p.id = $1`,
    [id],
  );

  return parseSchema(server, z.array(ProductionSchemaWithBackwardsRefs), result.rows, ParseContext.Database)[0] ?? null;
}

/**
 * Internal helper to fetch multiple productions by IDs.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param ids - The production IDs to fetch.
 * @returns The productions that were found, preserving the input ID order.
 */
export async function getProductionsByIds(
  server: FastifyInstance,
  ids: number[],
): Promise<ProductionWithBackwardsRefs[]> {
  if (ids.length === 0) return [];

  const result = await server.pg.query<ProductionWithBackwardsRefs>(
    `${ProductionSelect}
     WHERE p.id = ANY($1::int[])
     ORDER BY array_position($1::int[], p.id)`,
    [ids],
  );

  return parseSchema(server, z.array(ProductionSchemaWithBackwardsRefs), result.rows, ParseContext.Database);
}

/**
 * Fetches a single production by ID.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The production, or `null` if not found or parsing failed.
 */
export async function fetchProduction(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<ProductionWithBackwardsRefs | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  return await getProductionById(server, id);
}

/**
 * Fetches a single production by ID, including metadata.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The production with metadata, or `null` if not found or parsing failed.
 */
export async function fetchProductionWithMeta(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<ProductionWithMeta | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const result = await server.pg.query<ProductionWithMeta>(
    `SELECT
       p.id,
       p.old_id,
       p.finalized,
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
       p.created_at,
       p.updated_at,
       p.created_by,
       p.updated_by
     FROM production p
     WHERE p.id = $1`,
    [id],
  );

  return parseSchema(server, z.array(ProductionSchema.withMeta()), result.rows, ParseContext.Database)[0] ?? null;
}

const MAX_PAGE_SIZE = 100;
const MAX_SEARCH_LENGTH = 200;
const MAX_SEARCH_TERMS = 20;

const SearchParamSchema = z
  .preprocess((val: unknown): string[] | undefined => {
    if (val === undefined || val === null) return undefined;
    const raw = Array.isArray(val) ? val : [val];
    const trimmed = raw
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return trimmed.length === 0 ? undefined : trimmed;
  }, z.array(z.string().max(MAX_SEARCH_LENGTH)).max(MAX_SEARCH_TERMS).optional())
  .transform((arr): string[] | undefined => {
    if (!arr || arr.length === 0) return undefined;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of arr) {
      const k = s.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(s);
    }
    return out;
  });

const ProductionListQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    search: SearchParamSchema,
  })
  .refine(
    (q) => q.limit !== undefined || q.offset === undefined || q.offset === 0,
    { message: "`offset` requires `limit`" },
  );

/** Escape `%`, `_`, and `\` for use in `ILIKE ... ESCAPE '\\'`. */
function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

type ListSearchClause = { sql: string; params: string[] };

/**
 * WHERE clause for public list search: title, artist, tagline, teaser,
 * description (all locales in JSON text), and hall names via events.
 * Multiple terms are combined with AND (each term must match somewhere).
 */
function productionListSearchClause(searchTerms: string[]): ListSearchClause {
  if (searchTerms.length === 0) {
    return { sql: "", params: [] };
  }
  const conds: string[] = [];
  const params: string[] = [];
  for (const term of searchTerms) {
    const pattern = `%${escapeIlikePattern(term)}%`;
    const idx = params.length + 1;
    conds.push(`(p.title::text ILIKE $${idx} ESCAPE '\\'
    OR p.artist::text ILIKE $${idx} ESCAPE '\\'
    OR p.tagline::text ILIKE $${idx} ESCAPE '\\'
    OR p.teaser::text ILIKE $${idx} ESCAPE '\\'
    OR COALESCE(p.description::text, '') ILIKE $${idx} ESCAPE '\\'
    OR EXISTS (
      SELECT 1 FROM event e
      INNER JOIN hall h ON e.hall = h.id
      WHERE e.production = p.id
        AND h.name::text ILIKE $${idx} ESCAPE '\\'
    ))`);
    params.push(pattern);
  }
  return { sql: ` WHERE ${conds.join(" AND ")}`, params };
}

export type PaginatedProductions = {
  items: ProductionWithBackwardsRefs[];
  total: number;
};

/**
 * Fetches a list of productions.
 *
 * - Without `limit`: returns every production (same ordering as before), as `{ items, total }`.
 * - With `limit`: returns a page `{ items, total }` where `total` is the matching row count.
 * - Optional `search`: repeat the parameter for multiple terms, production must match
 *   every term (case-insensitive substring on title, artist, tagline, teaser,
 *   description, and related hall names). A single `search` behaves as before.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request; optional `limit`, `offset`, and `search` query params.
 * @returns The list of productions as `{ items, total }`; throws if parsing failed.
 */
export async function fetchProductions(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<PaginatedProductions> {
  const query = parseSchema(
    server,
    ProductionListQuerySchema,
    request.query,
    ParseContext.Request,
  );
  const limit = query.limit;
  const offset = query.offset ?? 0;
  const searchTerms = query.search ?? [];
  const { sql: whereSql, params: searchParams } = productionListSearchClause(searchTerms);

  let result: QueryResult<ProductionWithBackwardsRefs>;
  let total: number;

  if (limit === undefined) {
    result = await server.pg.query<ProductionWithBackwardsRefs>(
      `${ProductionSelect}${whereSql} ORDER BY p.id ASC`,
      searchParams,
    );
    total = result.rows.length;
  } else {
    const countResult = await server.pg.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM production p${whereSql}`,
      searchParams,
    );
    total = countResult.rows[0]?.count ?? 0;

    const listParams = [...searchParams, limit, offset];
    const limitIdx = searchParams.length + 1;
    const offsetIdx = searchParams.length + 2;
    result = await server.pg.query<ProductionWithBackwardsRefs>(
      `${ProductionSelect}${whereSql} ORDER BY p.id ASC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      listParams,
    );
  }

  const items = parseSchema(
    server,
    z.array(ProductionSchemaWithBackwardsRefs),
    result.rows,
    ParseContext.Database,
  );
  return { items, total };
}

