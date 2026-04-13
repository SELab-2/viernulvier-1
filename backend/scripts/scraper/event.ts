import type { ViernulvierEventStartBounds } from "./event-bounds.js";
import { localApiUrl } from "./local-api.js";
import { scrapeEventPricesForEvent } from "./event_price.js";
import { totalPagesFromHydraView } from "./hydra-view.js";

/**
 * Bounds on external `aanvang` (event start) for `GET https://www.viernulvier.gent/api/v1/events`.
 *
 * - **Full historical backfill:** `{ before: new Date() }` — events with start **before** “now” (UTC on the wire).
 * - **Nightly archive slice:** both `after` and `before`, e.g. {@link previousBrusselsDayBounds} from `./zoned-day.js`.
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
  /** Often omitted on the external API. */
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

interface ViernulvierApiResponse {
  totalItems: number;
  member: EventJSON[];
}

// Fetch singular page and return raw response
async function fetchPageRequest(
  page: number,
  authToken: string,
  bounds: ViernulvierEventStartBounds,
) {
  const url = new URL("https://www.viernulvier.gent/api/v1/events");
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

// Fetch singular page of events, used for pagination, refine response to return parsed JSON
async function fetchEventsPage(
  page: number,
  authToken: string,
  bounds: ViernulvierEventStartBounds,
): Promise<ViernulvierApiResponse> {
  const response = await fetchPageRequest(page, authToken, bounds);

  const data = await response.json() as ViernulvierApiResponse;

  return data;
}

// Fetch first page to obtain the view and total items, view will contain the last page number, which we can use to fetch all pages
async function fetchEventsListMeta(
  authToken: string,
  bounds: ViernulvierEventStartBounds,
): Promise<EventListMeta> {
  const response = await fetchPageRequest(1, authToken, bounds);

  const data = await response.json() as EventListMeta;

  return data;
}

// Login to the new API to obtain an auth token
async function login(username: string, password: string): Promise<string> {
  const response = await fetch(localApiUrl("/api/v1/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${response.statusText}`);
  }
  const data = await response.json() as { token: string };
  return data.token;
}

/** Map legacy hall id → local DB id (filled via GET; halls must be imported first). */
const hallIdByOldId: Record<number, number> = {};

async function resolveHallId(oldId: number, authToken: string): Promise<number> {
  const cached = hallIdByOldId[oldId];
  if (cached !== undefined) return cached;

  const url = localApiUrl(`/api/v1/hall?old_id=${oldId}`);
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "X-AUTH-TOKEN": authToken,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to resolve hall old_id=${oldId} from local API: ${response.status} ${response.statusText}`,
    );
  }

  const halls = (await response.json()) as { id: number }[];
  if (halls.length === 0) {
    throw new Error(
      `No hall with old_id=${oldId} in local API. Run a full scrape (halls → productions → events) so halls are imported first.`,
    );
  }
  if (halls.length > 1) {
    throw new Error(`Multiple halls found with old_id=${oldId}`);
  }

  const id = halls[0]!.id;
  hallIdByOldId[oldId] = id;
  return id;
}

/** Map legacy production id → local DB id (filled via GET; productions must be imported first). */
const productionIdByOldId: Record<number, number> = {};

async function resolveProductionId(oldId: number, authToken: string): Promise<number> {
  const cached = productionIdByOldId[oldId];
  if (cached !== undefined) return cached;

  const url = new URL(localApiUrl("/api/v1/production"));
  url.searchParams.set("old_id", String(oldId));

  const response = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
      "X-AUTH-TOKEN": authToken,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to resolve production old_id=${oldId} from local API: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as { items: { id: number }[]; total: number };
  if (data.total === 0) {
    throw new Error(
      `No production with old_id=${oldId} in local API. Run a full scrape (halls → productions → events) so productions are imported before events.`,
    );
  }
  if (data.total > 1) {
    throw new Error(`Multiple productions found with old_id=${oldId}`);
  }

  const id = data.items[0]!.id;
  productionIdByOldId[oldId] = id;
  return id;
}

async function fetchLocalEventIdByOldId(oldId: number, authToken: string): Promise<number | null> {
  const url = localApiUrl(`/api/v1/event?old_id=${oldId}`);
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "X-AUTH-TOKEN": authToken,
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
async function ensureEventImported(event: EventJSON, authToken: string, loginToken: string): Promise<void> {
  const id = parseInt(event["@id"].split("/").pop() as string, 10);

  const existingEventId = await fetchLocalEventIdByOldId(id, authToken);
  if (existingEventId !== null) {
    console.log(`Event old_id=${id} already exists locally (id=${existingEventId}), skipping create`);
    return;
  }

  const hallId = parseInt(event.hall.split("/").pop() as string, 10);
  const productionId = parseInt(event.production["@id"].split("/").pop() as string, 10);

  const body = {
    old_id: id,
    starts_at: event.starts_at,
    ends_at: optionalIsoTimestamp(event.ends_at),
    doors_at: optionalIsoTimestamp(event.doors_at),
    info: event.info ?? null,
    production: await resolveProductionId(productionId, authToken),
    hall: await resolveHallId(hallId, authToken),
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

  // Add prices after event is created, to avoid foreign key constraint errors
  const priceUrls = event.prices ?? [];
  const prices = priceUrls.map((priceUrl) => parseInt(priceUrl.split("/").pop() as string, 10));
  if (prices.length > 0) {
    await scrapeEventPricesForEvent(prices, eventId, authToken, loginToken);
  }
}

// fetch the amount of pages, then fetch each page and process the events
export async function scrapeAllEvents(
  authToken: string,
  bounds: ViernulvierEventStartBounds = {},
) {
  const resolved = resolveEventStartBounds(bounds);
  const loginToken = await login("admin", "password");
  const meta = await fetchEventsListMeta(authToken, resolved);
  const totalPages = totalPagesFromHydraView(meta.view);
  
  for (let page = 1; page <= totalPages; page++) {
    const data = await fetchEventsPage(page, authToken, resolved);
    for (const event of data.member) {
      console.log(`Processing event ${event["@id"]} (${page}/${totalPages})`);
      await ensureEventImported(event, authToken, loginToken);
    }
  }
}