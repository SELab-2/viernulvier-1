/**
 * Bounds on event start time for `GET …/api/v1/events`, sent as `starts_at[before]` / `starts_at[after]`
 */
export type ViernulvierEventStartBounds = {
  /** `starts_at[before]` — upper bound on start time (UTC ISO on the wire). */
  before?: Date;
  /** `starts_at[after]` — lower bound on start time (UTC ISO on the wire). */
  after?: Date;
};
