/** Year span committed from the dual-thumb slider (null = full span = no filter). */
export type YearSpan = { from: number; to: number };

/** Maps slider thumbs to v-model: full range clears the filter. */
export function committedYearRangeFromThumbs(
  localFrom: number,
  localTo: number,
  minYear: number,
  maxYear: number,
): YearSpan | null {
  if (localFrom === minYear && localTo === maxYear) return null;
  return { from: localFrom, to: localTo };
}

/** ISO date strings (`YYYY-MM-DD`): swap if the user picked end before start. */
export function orderIsoDatePairIfReversed(
  from: string | null,
  to: string | null,
): { from: string | null; to: string | null } {
  if (from && to && from > to) {
    return { from: to, to: from };
  }
  return { from, to };
}
