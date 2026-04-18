import z from "zod";
import { SearchParamSchema } from "./search.js";

export const MAX_PAGE_SIZE = 100;

/**
 * Parsed query for `GET /production`: pagination (`limit` / `offset`), optional `search` terms, and optional `old_id` filter.
 */
export const ProductionListQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    search: SearchParamSchema,
    old_id: z.coerce.number().int().nonnegative().optional(),
  })
  .refine(
    (q) => q.limit !== undefined || q.offset === undefined || q.offset === 0,
    { message: "`offset` requires `limit`" },
  );
