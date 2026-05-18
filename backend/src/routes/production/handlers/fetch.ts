import type { FastifyInstance, FastifyRequest } from "fastify";
import type { QueryResult } from "pg";
import type {
  ProductionWithBackwardsRefs,
  ProductionWithMeta,
} from "@viernulvier/shared/index.js";
import {
  ProductionSchema,
  ProductionSchemaWithBackwardsRefs,
  productionListErrorCodeForMessage,
  serial,
} from "@viernulvier/shared/index.js";
import {
  HttpClientError,
  HttpError,
  parseParams,
  parseSchema,
  ParseContext,
} from "@/routes/helpers.js";
import {
  buildProductionListWhere,
  EVENT_TZ,
  parsePositiveIdList,
} from "../helpers/list-where.js";
import { ProductionListQuerySchema } from "../helpers/pagination.js";
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
  (SELECT COALESCE(ARRAY_AGG(pt.tag), '{}') FROM production_tag pt WHERE pt.production = p.id) AS tags,
  (SELECT COALESCE(ARRAY_AGG(bp.blogpost), '{}') FROM production_blogpost bp WHERE bp.production = p.id) AS blogposts
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

  return (
    parseSchema(
      server,
      z.array(ProductionSchemaWithBackwardsRefs),
      result.rows,
      ParseContext.Database,
    )[0] ?? null
  );
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

  return parseSchema(
    server,
    z.array(ProductionSchemaWithBackwardsRefs),
    result.rows,
    ParseContext.Database,
  );
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
  const { id } = parseParams(request, z.object({ id: serial() }));
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
  const { id } = parseParams(request, z.object({ id: serial() }));
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

  return (
    parseSchema(
      server,
      z.array(ProductionSchema.withMeta()),
      result.rows,
      ParseContext.Database,
    )[0] ?? null
  );
}

export type PaginatedProductions = {
  items: ProductionWithBackwardsRefs[];
  total: number;
};

type ListDateFilters = {
  yearRange: { from: number; to: number } | undefined;
  dateFrom: string | undefined;
  dateTo: string | undefined;
};

function buildProductionListOrderClause(
  sortBy: "name" | "date" | undefined,
  sortDir: "asc" | "desc" | undefined,
  lang: "nl" | "fr" | "en" | undefined,
  dates: ListDateFilters,
  legacyOldId: number | undefined,
  /** 1-based index of the next `$n` placeholder after WHERE params */
  nextParamIndex: number,
): { sql: string; extraParams: unknown[] } {
  const dir = sortDir === "desc" ? "DESC" : "ASC";
  if (sortBy === "date") {
    const useFilteredEventSort =
      legacyOldId === undefined &&
      (dates.yearRange !== undefined ||
        (dates.dateFrom !== undefined && dates.dateTo !== undefined));

    if (useFilteredEventSort) {
      const agg = sortDir === "desc" ? "MAX" : "MIN";
      let idx = nextParamIndex;
      const conj: string[] = ["e.production = p.id", "e.starts_at IS NOT NULL"];
      const extraParams: unknown[] = [];

      if (dates.yearRange !== undefined) {
        conj.push(
          `(EXTRACT(YEAR FROM (e.starts_at AT TIME ZONE '${EVENT_TZ}')))::int BETWEEN $${idx}::int AND $${idx + 1}::int`,
        );
        extraParams.push(dates.yearRange.from, dates.yearRange.to);
        idx += 2;
      }
      if (dates.dateFrom !== undefined && dates.dateTo !== undefined) {
        conj.push(`(e.starts_at AT TIME ZONE '${EVENT_TZ}')::date >= $${idx}::date`);
        extraParams.push(dates.dateFrom);
        idx += 1;
        conj.push(`(e.starts_at AT TIME ZONE '${EVENT_TZ}')::date <= $${idx}::date`);
        extraParams.push(dates.dateTo);
        idx += 1;
      }

      const whereEvents = conj.join("\n        AND ");
      return {
        sql: `ORDER BY (
        SELECT ${agg}(e.starts_at)
        FROM event e
        WHERE ${whereEvents}
      ) ${dir} NULLS LAST, p.id ASC`,
        extraParams,
      };
    }

    // No date/year filter (or legacy-only query): cheapest ordering — first event row by pk.
    return {
      sql: `ORDER BY (
      SELECT e.starts_at
      FROM event e
      WHERE e.production = p.id
      ORDER BY e.id ASC
      LIMIT 1
    ) ${dir} NULLS LAST, p.id ASC`,
      extraParams: [],
    };
  }
  if (sortBy === "name") {
    const key = lang ?? "nl";
    const titleExpr = `COALESCE(NULLIF(TRIM(p.title->>'${key}'), ''), NULLIF(TRIM(p.title->>'nl'), ''), NULLIF(TRIM(p.title->>'en'), ''), NULLIF(TRIM(p.title->>'fr'), ''), '')`;
    return { sql: `ORDER BY LOWER(${titleExpr}) ${dir}, p.id ASC`, extraParams: [] };
  }
  return { sql: "ORDER BY p.id ASC", extraParams: [] };
}

/**
 * Fetches a list of productions.
 *
 * - Without `limit`: returns every production (same ordering as before), as `{ items, total }`.
 * - With `limit`: returns a page `{ items, total }` where `total` is the matching row count.
 * - Optional `search`: comma-separated terms (`search=a,b`), AND semantics (same encoding style
 *   as `tags`). Repeating the `search` key is still accepted for older clients.
 * - Optional `tags`: comma-separated tag IDs — production must include at least one of these tags.
 * - Optional `yearMin` / `yearMax` (inclusive) — event year must fall in that span.
 * - Optional `from` / `to` (`YYYY-MM-DD`) — production must have an event in that range (venue TZ).
 * - Optional `old_id` — legacy id; when set, only `p.old_id` (same as staging; other filters ignored).
 * - Optional `sortBy` / `sortDir` / `lang` — `date` uses the first `event` by `id` when no
 *   year/date list filters apply; with `yearMin`/`yearMax` and/or `from`/`to`, `date` sorts by
 *   `MIN`/`MAX(starts_at)` over events matching those filters (venue TZ), so order matches the window.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request; optional list query params as documented above.
 * @returns The list of productions as `{ items, total }`; throws if parsing failed.
 */
export async function fetchProductions(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<PaginatedProductions> {
  const parsedQuery = ProductionListQuerySchema.safeParse(request.query);
  if (!parsedQuery.success) {
    server.log.error(parsedQuery.error);
    const msg = parsedQuery.error.issues[0]?.message ?? "Bad Request";
    const code = productionListErrorCodeForMessage(msg);
    throw new HttpError(HttpClientError.BadRequest, msg, code);
  }
  const query = parsedQuery.data;
  const limit = query.limit;
  const offset = query.offset ?? 0;
  const searchTerms = query.search ?? [];
  const tagIds = parsePositiveIdList(query.tags);
  const yearRange =
    query.yearMin !== undefined && query.yearMax !== undefined
      ? { from: query.yearMin, to: query.yearMax }
      : undefined;
  const dateFrom = query.from;
  const dateTo = query.to;
  const { whereSql, params: filterParams } = buildProductionListWhere(
    searchTerms,
    tagIds,
    yearRange,
    dateFrom,
    dateTo,
    query.old_id,
  );
  const { sql: orderSql, extraParams: orderExtraParams } =
    buildProductionListOrderClause(
      query.sortBy,
      query.sortDir,
      query.lang,
      { yearRange, dateFrom, dateTo },
      query.old_id,
      filterParams.length + 1,
    );
  const listBaseParams = [...filterParams, ...orderExtraParams];

  let result: QueryResult<ProductionWithBackwardsRefs>;
  let total: number;

  if (limit === undefined) {
    result = await server.pg.query<ProductionWithBackwardsRefs>(
      `${ProductionSelect}${whereSql} ${orderSql}`,
      listBaseParams,
    );
    total = result.rows.length;
  } else {
    const countResult = await server.pg.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM production p${whereSql}`,
      filterParams,
    );
    total = countResult.rows[0]?.count ?? 0;

    const listParams = [...listBaseParams, limit, offset];
    const limitIdx = listBaseParams.length + 1;
    const offsetIdx = listBaseParams.length + 2;
    result = await server.pg.query<ProductionWithBackwardsRefs>(
      `${ProductionSelect}${whereSql} ${orderSql} LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
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
