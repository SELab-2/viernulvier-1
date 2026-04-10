import z from "zod";
import { SearchParamSchema } from "./search.js";

export const MAX_PAGE_SIZE = 100;

/** Zod refine message for `from` / `to` order; also used in API responses and client copy mapping. */
export const PRODUCTION_LIST_DATE_RANGE_ORDER_MESSAGE =
  "`from` must be on or before `to`";

/**
 * Parsed query for `GET /production`: pagination, optional `search`, `tags`, `years`, `from`/`to`.
 */
export const ProductionListQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    search: SearchParamSchema,
    tags: z.string().max(400).optional(),
    years: z.string().max(400).optional(),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .refine(
    (q) => q.limit !== undefined || q.offset === undefined || q.offset === 0,
    { message: "`offset` requires `limit`" },
  )
  .refine(
    (q) =>
      (q.from === undefined && q.to === undefined) ||
      (q.from !== undefined && q.to !== undefined),
    { message: "`from` and `to` must both be provided" },
  )
  .refine((q) => (q.from && q.to ? q.from <= q.to : true), {
    message: PRODUCTION_LIST_DATE_RANGE_ORDER_MESSAGE,
  });
