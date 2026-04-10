const MAX_TAG_FILTER_IDS = 30;
const TAG_ID_MAX = 2_147_483_647;

/** Event timestamps are interpreted in this zone for year/day filters (venue locale). */
const EVENT_TZ = "Europe/Brussels";

export function parsePositiveIdList(raw: string | undefined): number[] {
  if (raw === undefined || raw.trim() === "") return [];
  const out: number[] = [];
  for (const part of raw.split(",")) {
    const n = Number.parseInt(part.trim(), 10);
    if (
      Number.isFinite(n) &&
      n > 0 &&
      n <= TAG_ID_MAX &&
      Number.isInteger(n)
    ) {
      out.push(n);
    }
  }
  return [...new Set(out)].slice(0, MAX_TAG_FILTER_IDS);
}

/** Escape `%`, `_`, and `\` for use in `ILIKE ... ESCAPE '\\'`. */
function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Combined WHERE for public list: text search (AND across terms), tag IDs (AND),
 * optional inclusive calendar-year span on events, and/or event date range on `starts_at`.
 */
export function buildProductionListWhere(
  searchTerms: string[],
  tagIds: number[],
  yearRange: { from: number; to: number } | undefined,
  dateFrom: string | undefined,
  dateTo: string | undefined,
): { whereSql: string; params: unknown[] } {
  const parts: string[] = [];
  const params: unknown[] = [];

  for (const term of searchTerms) {
    const pattern = `%${escapeIlikePattern(term)}%`;
    const idx = params.length + 1;
    parts.push(`(p.title::text ILIKE $${idx} ESCAPE '\\'
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

  for (const id of tagIds) {
    const idx = params.length + 1;
    parts.push(
      `EXISTS (SELECT 1 FROM production_tag pt WHERE pt.production = p.id AND pt.tag = $${idx})`,
    );
    params.push(id);
  }

  if (yearRange !== undefined) {
    const i1 = params.length + 1;
    const i2 = params.length + 2;
    parts.push(
      `EXISTS (SELECT 1 FROM event e WHERE e.production = p.id AND e.starts_at IS NOT NULL`
        + ` AND (EXTRACT(YEAR FROM (e.starts_at AT TIME ZONE '${EVENT_TZ}')))::int BETWEEN $${i1}::int AND $${i2}::int)`,
    );
    params.push(yearRange.from, yearRange.to);
  }

  if (dateFrom !== undefined && dateTo !== undefined) {
    const i1 = params.length + 1;
    const i2 = params.length + 2;
    parts.push(
      `EXISTS (SELECT 1 FROM event e WHERE e.production = p.id AND e.starts_at IS NOT NULL`
        + ` AND (e.starts_at AT TIME ZONE '${EVENT_TZ}')::date >= $${i1}::date`
        + ` AND (e.starts_at AT TIME ZONE '${EVENT_TZ}')::date <= $${i2}::date)`,
    );
    params.push(dateFrom, dateTo);
  }

  if (parts.length === 0) {
    return { whereSql: "", params: [] };
  }
  return { whereSql: ` WHERE ${parts.join(" AND ")}`, params };
}
