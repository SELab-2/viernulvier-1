/**
 * Sample `tags` / `events` id arrays for mocked production rows — matches typical API responses.
 */
export const MOCK_PRODUCTION_TAG_IDS = [1] as const;
export const MOCK_PRODUCTION_EVENT_IDS = [5197, 5204, 5217] as const;
export const MOCK_PRODUCTION_BLOGPOST_IDS = [1, 3] as const;

/** Second production in multi-row tests (distinct ids). */
export const MOCK_PRODUCTION_TAG_IDS_ALT = [2, 3] as const;
export const MOCK_PRODUCTION_EVENT_IDS_ALT = [401, 402] as const;
export const MOCK_PRODUCTION_BLOGPOST_IDS_ALT = [2] as const;

export function productionRowWithRefs<T extends object>(row: T) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rowWithAny = row as any;
  return {
    ...row,
    tags: rowWithAny.tags ?? [...MOCK_PRODUCTION_TAG_IDS],
    events: rowWithAny.events ?? [...MOCK_PRODUCTION_EVENT_IDS],
    blogposts: rowWithAny.blogposts ?? [...MOCK_PRODUCTION_BLOGPOST_IDS],
  };
}

export function productionRowWithRefsAlt<T extends object>(row: T) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rowWithAny = row as any;
  return {
    ...row,
    tags: rowWithAny.tags ?? [...MOCK_PRODUCTION_TAG_IDS_ALT],
    events: rowWithAny.events ?? [...MOCK_PRODUCTION_EVENT_IDS_ALT],
    blogposts: rowWithAny.blogposts ?? [...MOCK_PRODUCTION_BLOGPOST_IDS_ALT],
  };
}
