import type { ViernulvierEventStartBounds } from "./event-bounds.js";
import { fetchScraperJwt } from "./auth.js";
import { scrapeHallById } from "./hall.js";
import { localApiUrl } from "./local-api.js";
import { scrapeProductionById } from "./production.js";
import { syncProductionGenreTagsFromViernulvier } from "./production-tags.js";
import { scrapeEventPricesForEvent } from "./event_price.js";
import { totalPagesFromHydraView } from "./hydra-view.js";
import { viernulvierApiUrl } from "./viernulvier-api.js";
import { createEmptyRunStats, type ScrapeRunStats } from "./scrape-stats.js";

/**
 * Archive scraper is event-first: only pages the Viernulvier events API (with `aanvang` bounds).
 * Halls and productions are lazy-imported per event via {@link scrapeHallById} / {@link scrapeProductionById}
 * when missing locally
 *
 * Bounds on external `aanvang` (event start) for `GET {origin}/api/v1/events` (see {@link viernulvierApiUrl}):
 *
 * - Full past backfill: `{ before: new Date() }` — performances starting before “now” (confirm semantics on live API).
 * - Incremental slice: both `after` and `before`, e.g. {@link previousBrusselsDayBounds}.
 *
 * If both are omitted, {@link scrapeAllEvents} defaults to `{ before: new Date() }`.
 */
export type { ViernulvierEventStartBounds } from "./event-bounds.js";
export {
  ARCHIVE_TIME_ZONE,
  formatYmdInTimeZone,
  previousBrusselsDayBounds,
  startOfCalendarDayUtc,
} from "./zoned-day.js";

/**
 * Supplies default `{ before: new Date() }` when the caller passes an empty bounds object.
 */
function resolveEventStartBounds(bounds: ViernulvierEventStartBounds): ViernulvierEventStartBounds {
  if (bounds.before !== undefined || bounds.after !== undefined) {
    return bounds;
  }
  return { before: new Date() };
}

interface EventListMeta {
  totalItems: number;
  view: {
    "@id": string;
    "@type": string;
    first: string;
    last?: string;
  };
}

interface EventJSON {
  "@id": string;
  starts_at: string;
  ends_at?: string | null;
  doors_at?: string | null;
  info?: Record<string, string> | null;
  production: {
    "@id": string;
    "@type": string;
  };
  hall: string;
  prices?: string[] | null;
}

/** Viernulvier “longterm” runs use a different production IRI shape; we do not import them. */
function isLongtermViernulvierEvent(event: EventJSON): boolean {
  if (event.production["@type"] === "LongtermProduction") return true;
  return event.production["@id"].includes("/productions/longterm/");
}

interface ViernulvierApiResponse {
  totalItems: number;
  member: EventJSON[];
}

/**
 * Requests one page of the Viernulvier events list (`application/ld+json`) and returns the raw `Response`.
 */
async function fetchPageRequest(
  page: number,
  authToken: string,
  bounds: ViernulvierEventStartBounds,
) {
  const url = new URL(viernulvierApiUrl("/api/v1/events"));
  url.searchParams.append("page", page.toString());
  if (bounds.before !== undefined) {
    url.searchParams.append("aanvang[before]", bounds.before.toISOString());
  }
  if (bounds.after !== undefined) {
    url.searchParams.append("aanvang[after]", bounds.after.toISOString());
  }

  const response = await fetch(url.toString(), {
    headers: {
      accept: "application/ld+json",
      "X-AUTH-TOKEN": authToken,
    },
  });

  if (!response.ok) {
    throw new Error(`API returned status ${response.status}`);
  }

  return response;
}

/**
 * Fetches one page of events and parses the JSON body into {@link ViernulvierApiResponse}.
 */
async function fetchEventsPage(
  page: number,
  authToken: string,
  bounds: ViernulvierEventStartBounds,
): Promise<ViernulvierApiResponse> {
  const response = await fetchPageRequest(page, authToken, bounds);

  const data = await response.json() as ViernulvierApiResponse;

  return data;
}

/**
 * Fetches page 1 only to read Hydra `view` metadata (e.g. last page index via {@link totalPagesFromHydraView}).
 */
async function fetchEventsListMeta(
  authToken: string,
  bounds: ViernulvierEventStartBounds,
): Promise<EventListMeta> {
  const response = await fetchPageRequest(1, authToken, bounds);

  const data = await response.json() as EventListMeta;

  return data;
}

/** 
 * In-process cache: legacy hall id → local DB id (avoids repeat `scrapeHallById` work per run). 
 */
const hallIdByOldId: Record<number, number> = {};

const skippedHallOldIds = new Set<number>();

/**
 * Resolves legacy hall id to local primary key, using {@link scrapeHallById} when the row is not yet imported.
 */
async function resolveHallId(
  oldId: number,
  authToken: string,
  loginToken: string,
  stats: ScrapeRunStats,
): Promise<number | null> {
  if (skippedHallOldIds.has(oldId)) return null;
  const cached = hallIdByOldId[oldId];
  if (cached !== undefined) {
    stats.halls.reusedExisting++;
    return cached;
  }
  const id = await scrapeHallById(oldId, authToken, loginToken, stats);
  if (id === null) {
    skippedHallOldIds.add(oldId);
    return null;
  }
  hallIdByOldId[oldId] = id;
  return id;
}

/** 
 * In-process cache: legacy production id → local DB id. 
 */
const productionIdByOldId: Record<number, number> = {};

/** Legacy production ids that cannot be imported (404, no title, or local `POST` failed); do not retry every event. */
const skippedProductionOldIds = new Set<number>();

/**
 * Resolves legacy production id to local primary key, using {@link scrapeProductionById} when missing locally.
 */
async function resolveProductionId(
  oldId: number,
  authToken: string,
  loginToken: string,
  stats: ScrapeRunStats,
): Promise<number | null> {
  if (skippedProductionOldIds.has(oldId)) return null;
  const cached = productionIdByOldId[oldId];
  if (cached !== undefined) {
    stats.productions.reusedExisting++;
    await syncProductionGenreTagsFromViernulvier(
      oldId,
      cached,
      authToken,
      loginToken,
      stats,
    );
    return cached;
  }
  const id = await scrapeProductionById(oldId, authToken, loginToken, stats);
  if (id === null) {
    skippedProductionOldIds.add(oldId);
    return null;
  }
  productionIdByOldId[oldId] = id;
  await syncProductionGenreTagsFromViernulvier(oldId, id, authToken, loginToken, stats);
  return id;
}

/**
 * Returns the local event id for a legacy `old_id`, or `null` if no row exists yet.
 */
async function fetchLocalEventIdByOldId(oldId: number): Promise<number | null> {
  const url = localApiUrl(`/api/v1/event?old_id=${oldId}`);
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to resolve event old_id=${oldId} from local API: ${response.status} ${response.statusText}`,
    );
  }

  const events = (await response.json()) as { id: number }[];
  if (events.length === 0) return null;
  if (events.length > 1) {
    throw new Error(`Multiple events found with old_id=${oldId}`);
  }
  return events[0]!.id;
}

/**
 * External API often omits `ends_at` / `doors_at`; coerce absent, null, or blank to `null` for our API (`nullish` dates).
 */
function optionalIsoTimestamp(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.trim() === "") return null;
  return value;
}

/**
 * Idempotent event import: skip if `old_id` already exists; otherwise POST (and prices).
 */
async function ensureEventImported(
  event: EventJSON,
  authToken: string,
  loginToken: string,
  stats: ScrapeRunStats,
): Promise<void> {
  stats.events.seen++;

  const idSegment = event["@id"].split("/").pop();
  const id = idSegment !== undefined ? parseInt(idSegment, 10) : Number.NaN;
  if (!Number.isFinite(id)) {
    stats.events.skippedInvalidEventId++;
    console.warn(`Skipping event: could not parse legacy id from ${event["@id"]}`);
    return;
  }

  if (typeof event.starts_at !== "string" || event.starts_at.trim() === "") {
    stats.events.skippedMissingStartsAt++;
    console.warn(`Skipping event old_id=${id}: missing starts_at`);
    return;
  }
  if (Number.isNaN(Date.parse(event.starts_at))) {
    stats.events.skippedMissingStartsAt++;
    console.warn(`Skipping event old_id=${id}: invalid starts_at`);
    return;
  }

  const existingEventId = await fetchLocalEventIdByOldId(id);
  if (existingEventId !== null) {
    stats.events.skippedAlreadyImported++;
    console.log(`Event old_id=${id} already exists locally (id=${existingEventId}), skipping create`);
    return;
  }

  if (isLongtermViernulvierEvent(event)) {
    stats.events.skippedInvalidProductionRef++;
    console.warn(
      `Skipping event old_id=${id}: LongtermProduction is out of scope (${event.production["@id"]}).`,
    );
    return;
  }

  const hallSegment = event.hall.split("/").pop();
  const productionSegment = event.production["@id"].split("/").pop();
  const hallOldId = hallSegment !== undefined ? parseInt(hallSegment, 10) : Number.NaN;
  const productionOldId = productionSegment !== undefined ? parseInt(productionSegment, 10) : Number.NaN;

  if (!Number.isFinite(hallOldId)) {
    stats.events.skippedInvalidHallRef++;
    console.warn(`Skipping event old_id=${id}: invalid hall IRI (${event.hall}).`);
    return;
  }
  if (!Number.isFinite(productionOldId)) {
    stats.events.skippedInvalidProductionRef++;
    console.warn(`Skipping event old_id=${id}: invalid production IRI (${event.production["@id"]}).`);
    return;
  }

  const productionLocalId = await resolveProductionId(productionOldId, authToken, loginToken, stats);
  if (productionLocalId === null) {
    stats.events.skippedInvalidProductionRef++;
    console.warn(
      `Skipping event old_id=${id}: production old_id=${productionOldId} could not be imported (missing on API, no title, or create failed).`,
    );
    return;
  }

  const hallLocalId = await resolveHallId(hallOldId, authToken, loginToken, stats);
  if (hallLocalId === null) {
    stats.events.skippedInvalidHallRef++;
    console.warn(
      `Skipping event old_id=${id}: hall old_id=${hallOldId} could not be imported (missing on API or create failed).`,
    );
    return;
  }

  const body = {
    old_id: id,
    starts_at: event.starts_at,
    ends_at: optionalIsoTimestamp(event.ends_at),
    doors_at: optionalIsoTimestamp(event.doors_at),
    info: event.info ?? null,
    production: productionLocalId,
    hall: hallLocalId,
  };

  const response = await fetch(localApiUrl("/api/v1/event"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${loginToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to create event: ${response.status} ${response.statusText}`);
  }

  const eventId = (await response.json() as { id: number }).id;
  stats.events.imported++;

  /**
   * Import ticket prices only after the event row exists so `event_price.event` satisfies FK constraints.
   */
  const priceUrls = event.prices ?? [];
  const prices = priceUrls.map((priceUrl) => parseInt(priceUrl.split("/").pop() as string, 10));
  if (prices.length > 0) {
    await scrapeEventPricesForEvent(prices, eventId, authToken, loginToken);
  }
}

/**
 * Walks every page of the (bounded) Viernulvier events list and runs {@link ensureEventImported} per member.
 */
export async function scrapeAllEvents(
  authToken: string,
  bounds: ViernulvierEventStartBounds = {},
): Promise<ScrapeRunStats> {
  const stats = createEmptyRunStats();
  const resolved = resolveEventStartBounds(bounds);
  const loginToken = await fetchScraperJwt();
  const meta = await fetchEventsListMeta(authToken, resolved);
  const totalPages = totalPagesFromHydraView(meta.view);

  for (let page = 1; page <= totalPages; page++) {
    const data = await fetchEventsPage(page, authToken, resolved);
    for (const event of data.member) {
      console.log(`Processing event ${event["@id"]} (${page}/${totalPages})`);
      try {
        await ensureEventImported(event, authToken, loginToken, stats);
      } catch (err) {
        stats.events.failed++;
        console.error(err);
      }
    }
  }

  return stats;
}