import z from "zod";

export const MAX_SEARCH_LENGTH = 200;
export const MAX_SEARCH_TERMS = 20;

export const SearchParamSchema = z
  .preprocess((val: unknown): string[] | undefined => {
    if (val === undefined || val === null) return undefined;
    const raw = Array.isArray(val) ? val : [val];
    const trimmed = raw
      .filter((x): x is string => typeof x === "string")
      .flatMap((s) => s.split(","))
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

/** Escape `%`, `_`, and `\` for use in `ILIKE ... ESCAPE '\\'`. */
function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export type ListSearchClause = { sql: string; params: (string | number)[] };

interface SearchClauseParams {
  search?: string[] | undefined;
  old_id?: number | undefined;
}

const SearchClauseParamsSchema = z.object({
  search: SearchParamSchema,
  old_id: z.number().int().nonnegative().optional(),
});

/**
 * WHERE clause for public list search: title, artist, tagline, teaser,
 * description (all locales in JSON text), and hall names via events.
 * Multiple terms are combined with AND (each term must match somewhere).
 * If old_id is provided, filters by old_id instead of search terms.
 */
export function productionListSearchClause(params: SearchClauseParams): ListSearchClause {
  const validated = SearchClauseParamsSchema.parse(params);
  const searchTerms = validated.search ?? [];
  const oldId = validated.old_id;

  // If old_id is provided, filter by that instead
  if (oldId !== undefined) {
    return { sql: " WHERE p.old_id = $1", params: [oldId] };
  }

  if (searchTerms.length === 0) {
    return { sql: "", params: [] };
  }
  const conds: string[] = [];
  const params_list: string[] = [];
  for (const term of searchTerms) {
    const pattern = `%${escapeIlikePattern(term)}%`;
    const idx = params_list.length + 1;
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
    params_list.push(pattern);
  }
  return { sql: ` WHERE ${conds.join(" AND ")}`, params: params_list };
}
