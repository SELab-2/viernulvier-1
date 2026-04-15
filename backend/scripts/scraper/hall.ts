import type { Hall } from "@viernulvier/shared/index.js";

import { fetchScraperJwt } from "./auth.js";
import { totalPagesFromHydraView, VIERNULVIER_API_ORIGIN } from "./hydra-view.js";
import { localApiUrl } from "./local-api.js";
import type { ScrapeRunStats } from "./scrape-stats.js";

interface HallListMeta {
  totalItems: number;
  view: {
    "@id": string;
    "@type": string;
    first: string;
    last: string;
  };
}

interface HallJSON {
  "@id": string;
  name: string;
  description?: string;
  space?: string | null;
  [key: string]: unknown;
}

interface Location {
  street: string;
  number: string;
  postal_code: string;
  city: string;
  country: string;
  [key: string]: unknown;
}

interface Space {
  location: string;
  [key: string]: unknown;
}

interface ViernulvierHallApiResponse {
  totalItems: number;
  member: HallJSON[];
}

/**
 * Requests one page of the Viernulvier halls collection and returns the raw `Response`.
 */
async function fetchPageRequest(
  page: number = 1,
  authToken: string,
) {
  const url = new URL("https://www.viernulvier.gent/api/v1/halls");
  url.searchParams.append("page", page.toString());

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
 * Fetches one page of halls and parses JSON into {@link ViernulvierHallApiResponse}.
 */
async function fetchHallsPage(
  page: number = 1,
  authToken: string,
): Promise<ViernulvierHallApiResponse> {
  const response = await fetchPageRequest(page, authToken);

  const data = await response.json() as ViernulvierHallApiResponse;

  return data;
}

/**
 * Fetches page 1 only to read Hydra `view` metadata for total page count.
 */
async function fetchHallsListMeta(
  authToken: string
): Promise<HallListMeta> {
  const response = await fetchPageRequest(1, authToken);

  const data = await response.json() as HallListMeta;

  return data;
}

/**
 * Maps space resource URL (trimmed) → resolved address string for this process (avoids duplicate venue fetches).
 */
const spaceAddressCache = new Map<string, string>();

const NO_ADDRESS = "No address provided";

/** Path like `/api/v1/spaces/1` or an absolute URL if the API ever returns one. */
function resolveViernulvierFetchUrl(pathOrUrl: string): string {
  const s = pathOrUrl.trim();
  if (s.startsWith("http")) return s;
  return `${VIERNULVIER_API_ORIGIN}${s.startsWith("/") ? s : `/${s}`}`;
}

/**
 * Follows a hall’s `space` IRI (and nested `location`) on Viernulvier to build a single-line postal address.
 */
async function fetchSpaceLocation(spaceUrl: string | null | undefined, authToken: string): Promise<string> {
  if (typeof spaceUrl !== "string") {
    return NO_ADDRESS;
  }
  const spaceKey = spaceUrl.trim();
  if (spaceKey === "") {
    return NO_ADDRESS;
  }

  /*
   * Return a memoized address when this space URL was already resolved in this run.
   */
  if (spaceAddressCache.has(spaceKey)) {
    return spaceAddressCache.get(spaceKey) || NO_ADDRESS;
  }

  try {
    const url = resolveViernulvierFetchUrl(spaceKey);
    const response = await fetch(url, {
      headers: {
        accept: "application/ld+json",
        "X-AUTH-TOKEN": authToken,
      },
    });

    if (!response.ok) {
      spaceAddressCache.set(spaceKey, NO_ADDRESS);
      return NO_ADDRESS;
    }

    const space = (await response.json()) as Space;
    const address = await fetchLocationAddress(space.location, authToken);

    /*
     * Store the resolved address for later hall rows that share the same space.
     */
    spaceAddressCache.set(spaceKey, address);
    return address;
  } catch {
    spaceAddressCache.set(spaceKey, NO_ADDRESS);
    return NO_ADDRESS;
  }
}

/**
 * Loads a Viernulvier `location` resource and formats street, number, postal code, city, and country.
 */
async function fetchLocationAddress(locationUrl: string | null | undefined, authToken: string): Promise<string> {
  if (typeof locationUrl !== "string" || locationUrl.trim() === "") {
    return NO_ADDRESS;
  }

  try {
    const url = resolveViernulvierFetchUrl(locationUrl);
    const response = await fetch(url, {
      headers: {
        accept: "application/ld+json",
        "X-AUTH-TOKEN": authToken,
      },
    });

    if (!response.ok) {
      return NO_ADDRESS;
    }

    const location = (await response.json()) as Location;
    const address = `${location.street} ${location.number}, ${location.postal_code} ${location.city}, ${location.country}`;
    return address;
  } catch {
    return NO_ADDRESS;
  }
}

/** 
 * Local DB id if a hall with this legacy `old_id` exists, otherwise `null`. 
 */
export async function fetchLocalHallIdByOldId(oldId: number): Promise<number | null> {
  const url = localApiUrl(`/api/v1/hall?old_id=${oldId}`);
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch hall from own api: ${response.status} ${response.statusText}`);
  }

  const hallList = await response.json() as Hall[];
  if (hallList.length === 0) return null;
  if (hallList.length > 1) {
    throw new Error(`Multiple halls found with old_id ${oldId}`);
  }
  return hallList[0]!.id;
}

/**
 * `POST`s one hall parsed from Viernulvier JSON-LD into our API.
 */
async function createLocalHallFromViernulvierJson(
  hall: HallJSON,
  loginToken: string,
  authToken: string,
): Promise<number | null> {
  const id = parseInt(hall["@id"].split("/").pop() as string, 10);

  const address = await fetchSpaceLocation(hall.space, authToken);

  const body = {
    name: hall.name,
    address: address,
    old_id: id,
  };

  const response = await fetch(localApiUrl("/api/v1/hall"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${loginToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.warn(
      `Failed to create hall old_id=${id}: ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ""}`,
    );
    return null;
  }

  const hallId = (await response.json() as { id: number }).id;
  return hallId;
}

/**
 * Creates the hall locally when `old_id` is absent; otherwise returns the existing id.
 */
async function ensureHallImported(
  hall: HallJSON,
  loginToken: string,
  authToken: string,
): Promise<number | null> {
  const oldId = parseInt(hall["@id"].split("/").pop() as string, 10);
  const existing = await fetchLocalHallIdByOldId(oldId);
  if (existing !== null) {
    console.log(`Hall old_id=${oldId} already exists locally (id=${existing}), skipping create`);
    return existing;
  }
  return createLocalHallFromViernulvierJson(hall, loginToken, authToken);
}

/**
 * Optional full crawl of every Viernulvier hall (not used by the default `scrape.ts` entrypoint).
 */
export async function scrapeAllHalls(
  authToken: string
) {
  const loginToken = await fetchScraperJwt();

  const meta = await fetchHallsListMeta(authToken);
  const totalPages = totalPagesFromHydraView(meta.view);
  
  for (let page = 1; page <= totalPages; page++) {
    const data = await fetchHallsPage(page, authToken);
    for (const hall of data.member) {
      console.log(`Processing hall ${hall["@id"]} (${page}/${totalPages})`);
      await ensureHallImported(hall, loginToken, authToken);
    }
  }
}

/**
 * Returns `null` when the hall is missing on Viernulvier or local `POST` fails.
 */
export async function scrapeHallById(
  id: number,
  authToken: string,
  loginToken?: string,
  stats?: ScrapeRunStats,
): Promise<number | null> {
  const existing = await fetchLocalHallIdByOldId(id);
  if (existing !== null) {
    if (stats !== undefined) stats.halls.reusedExisting++;
    return existing;
  }

  const viernulvierUrl = `https://www.viernulvier.gent/api/v1/halls/${id}`;
  const viernulvierResponse = await fetch(viernulvierUrl, {
    headers: {
      accept: "application/ld+json",
      "X-AUTH-TOKEN": authToken,
    },
  });
  if (viernulvierResponse.status === 404) {
    console.warn(`Viernulvier hall old_id=${id} not found (404); will not import.`);
    return null;
  }
  if (!viernulvierResponse.ok) {
    console.warn(
      `Viernulvier hall old_id=${id} fetch failed: ${viernulvierResponse.status} ${viernulvierResponse.statusText}`,
    );
    return null;
  }
  const hall = await viernulvierResponse.json() as HallJSON;
  const jwt = loginToken ?? await fetchScraperJwt();
  const created = await createLocalHallFromViernulvierJson(hall, jwt, authToken);
  if (created !== null && stats !== undefined) stats.halls.created++;
  return created;
}