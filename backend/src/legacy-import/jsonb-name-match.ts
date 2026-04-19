/**
 * SQL snippets for matching legacy CSV strings against JSONB language maps (`title`, `name` on production/tag/hall).
 * Compares case-insensitively after trim; any non-empty language value may match.
 */

/** Populate a lookup map from all string values in a `name` / `title` JSONB object (used to warm caches). */
export function indexLanguageMapValues(
  map: Map<string, number>,
  id: number,
  nameJson: unknown,
  keyFn: (s: string) => string,
): void {
  if (nameJson === null || typeof nameJson !== "object") return;
  for (const v of Object.values(nameJson as Record<string, unknown>)) {
    if (typeof v === "string" && v.trim().length > 0) {
      map.set(keyFn(v), id);
    }
  }
}

/** Parameters: ($tagTypeId, $searchString) */
export const SQL_FIND_GENRE_TAG_ID_BY_ANY_LANG_NAME = `
SELECT id
FROM tag
WHERE tag_type = $1
  AND EXISTS (
    SELECT 1 FROM jsonb_each_text(name) kv
    WHERE kv.value IS NOT NULL
      AND trim(kv.value) <> ''
      AND lower(trim(kv.value)) = lower(trim($2::text))
  )
LIMIT 1
`;

/** Parameters: ($searchString) */
export const SQL_FIND_HALL_ID_BY_ANY_LANG_NAME = `
SELECT id, address
FROM hall
WHERE EXISTS (
  SELECT 1 FROM jsonb_each_text(name) kv
  WHERE kv.value IS NOT NULL
    AND trim(kv.value) <> ''
    AND lower(trim(kv.value)) = lower(trim($1::text))
)
LIMIT 1
`;

/**
 * Parameters: ($1 legacy titel, $2 legacy ondertitel / artist — may be empty string).
 * A row matches only if some language in `title` matches $1 AND either:
 * - $2 is non-empty and some language in `artist` matches $2, or
 * - $2 is empty and `artist` has no non-empty language value (scraped + legacy both “no artist”).
 */
export const SQL_FIND_PRODUCTION_ID_BY_TITLE_AND_ARTIST = `
SELECT p.id
FROM production p
WHERE EXISTS (
  SELECT 1 FROM jsonb_each_text(COALESCE(p.title, '{}'::jsonb)) kv_t
  WHERE kv_t.value IS NOT NULL
    AND trim(kv_t.value) <> ''
    AND lower(trim(kv_t.value)) = lower(trim($1::text))
)
AND (
  (
    trim(COALESCE($2::text, '')) <> ''
    AND EXISTS (
      SELECT 1 FROM jsonb_each_text(COALESCE(p.artist, '{}'::jsonb)) kv_a
      WHERE kv_a.value IS NOT NULL
        AND trim(kv_a.value) <> ''
        AND lower(trim(kv_a.value)) = lower(trim($2::text))
    )
  )
  OR (
    trim(COALESCE($2::text, '')) = ''
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_each_text(COALESCE(p.artist, '{}'::jsonb)) kv_a
      WHERE kv_a.value IS NOT NULL AND trim(kv_a.value) <> ''
    )
  )
)
LIMIT 1
`;
