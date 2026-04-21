/**
 * Production list query validation shared between API (Zod) and clients.
 * Prefer matching {@link PRODUCTION_LIST_ERROR_CODE} on responses over comparing `error` text.
 */

/** Zod refine message for `from` / `to` order; included in API `error` body. */
export const PRODUCTION_LIST_DATE_RANGE_ORDER_MESSAGE =
  "`from` must be on or before `to`" as const;

/** Year-span filter must use min ≤ max (calendar years). */
export const PRODUCTION_LIST_YEAR_RANGE_ORDER_MESSAGE =
  "`yearMin` must be on or before `yearMax`" as const;

/** Stable machine-readable codes returned in JSON `code` on 400 responses. */
export const PRODUCTION_LIST_ERROR_CODE = {
  DATE_RANGE_ORDER: "PRODUCTION_LIST_DATE_RANGE_ORDER",
  YEAR_RANGE_ORDER: "PRODUCTION_LIST_YEAR_RANGE_ORDER",
} as const;

export type ProductionListErrorCode =
  (typeof PRODUCTION_LIST_ERROR_CODE)[keyof typeof PRODUCTION_LIST_ERROR_CODE];

/** Map a Zod issue message to a code when the issue comes from list-query refines. */
export function productionListErrorCodeForMessage(
  message: string,
): ProductionListErrorCode | undefined {
  if (message === PRODUCTION_LIST_DATE_RANGE_ORDER_MESSAGE) {
    return PRODUCTION_LIST_ERROR_CODE.DATE_RANGE_ORDER;
  }
  if (message === PRODUCTION_LIST_YEAR_RANGE_ORDER_MESSAGE) {
    return PRODUCTION_LIST_ERROR_CODE.YEAR_RANGE_ORDER;
  }
  return undefined;
}
