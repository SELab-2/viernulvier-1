/**
 * Sample `tags` / `events` id arrays for mocked production rows — matches typical API responses.
 */
export const MOCK_PRODUCTION_TAG_IDS = [1] as const;
export const MOCK_PRODUCTION_EVENT_IDS = [5197, 5204, 5217] as const;

/** Second production in multi-row tests (distinct ids). */
export const MOCK_PRODUCTION_TAG_IDS_ALT = [2, 3] as const;
export const MOCK_PRODUCTION_EVENT_IDS_ALT = [401, 402] as const;

export function productionRowWithRefs<T extends object>(row: T) {
  return {
    ...row,
    tags: [...MOCK_PRODUCTION_TAG_IDS],
    events: [...MOCK_PRODUCTION_EVENT_IDS],
  };
}

export function productionRowWithRefsAlt<T extends object>(row: T) {
  return {
    ...row,
    tags: [...MOCK_PRODUCTION_TAG_IDS_ALT],
    events: [...MOCK_PRODUCTION_EVENT_IDS_ALT],
  };
}
