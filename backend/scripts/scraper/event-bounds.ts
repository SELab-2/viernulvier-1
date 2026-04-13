/**
 * Bounds on external `aanvang` (event start) for `GET https://www.viernulvier.gent/api/v1/events`.
 */
export type ViernulvierEventStartBounds = {
  /** `aanvang[before]` — upper bound on start time (UTC ISO string on the wire). */
  before?: Date;
  /** `aanvang[after]` — lower bound on start time (UTC ISO string on the wire). */
  after?: Date;
};
