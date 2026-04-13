import type { Hall } from "@viernulvier/shared/index.js";

import { totalPagesFromHydraView, VIERNULVIER_API_ORIGIN } from "./hydra-view.js";
import { localApiUrl } from "./local-api.js";

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
  /** Usually `/api/v1/spaces/...`; sometimes omitted on the external API. */
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

// Fetch singular page and return raw response
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

// Fetch singular page of halls, used for pagination, refine response to return parsed JSON
async function fetchHallsPage(
  page: number = 1,
  authToken: string,
): Promise<ViernulvierHallApiResponse> {
  const response = await fetchPageRequest(page, authToken);

  const data = await response.json() as ViernulvierHallApiResponse;

  return data;
}

// Fetch first page to obtain the view and total items, view will contain the last page number, which we can use to fetch all pages
async function fetchHallsListMeta(
  authToken: string
): Promise<HallListMeta> {
  const response = await fetchPageRequest(1, authToken);

  const data = await response.json() as HallListMeta;

  return data;
}

// Cache for space addresses to avoid repeated API calls
const spaceAddressCache = new Map<string, string>();

const NO_ADDRESS = "No address provided";

/** Path like `/api/v1/spaces/1` or an absolute URL if the API ever returns one. */
function resolveViernulvierFetchUrl(pathOrUrl: string): string {
  const s = pathOrUrl.trim();
  if (s.startsWith("http")) return s;
  return `${VIERNULVIER_API_ORIGIN}${s.startsWith("/") ? s : `/${s}`}`;
}

async function fetchSpaceLocation(spaceUrl: string | null | undefined, authToken: string): Promise<string> {
  if (typeof spaceUrl !== "string") {
    return NO_ADDRESS;
  }
  const spaceKey = spaceUrl.trim();
  if (spaceKey === "") {
    return NO_ADDRESS;
  }

  // Check cache first
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
    
    // Cache the result
    spaceAddressCache.set(spaceKey, address);
    return address;
  } catch {
    spaceAddressCache.set(spaceKey, NO_ADDRESS);
    return NO_ADDRESS;
  }
}

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

async function login(username: string, password: string): Promise<string> {
  const response = await fetch(localApiUrl("/api/v1/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error(`Failed to login: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { token: string };
  return data.token;
}


/** Local DB id if a hall with this legacy `old_id` exists, otherwise `null`. */
export async function fetchLocalHallIdByOldId(
  oldId: number,
  authToken: string,
): Promise<number | null> {
  const url = localApiUrl(`/api/v1/hall?old_id=${oldId}`);
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "X-AUTH-TOKEN": authToken,
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

async function createLocalHallFromViernulvierJson(
  hall: HallJSON,
  loginToken: string,
  authToken: string,
): Promise<number> {
  const id = parseInt(hall["@id"].split("/").pop() as string, 10);

  const address = await fetchSpaceLocation(hall.space, authToken);

  const body = {
    name: hall.name,
    address: address,
    old_id: id,
    vendor_id: 0,
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
    throw new Error(`Failed to create hall: ${response.status} ${response.statusText}`);
  }

  const hallId = (await response.json() as { id: number }).id;
  return hallId;
}

async function ensureHallImported(
  hall: HallJSON,
  loginToken: string,
  authToken: string,
): Promise<number> {
  const oldId = parseInt(hall["@id"].split("/").pop() as string, 10);
  const existing = await fetchLocalHallIdByOldId(oldId, authToken);
  if (existing !== null) {
    console.log(`Hall old_id=${oldId} already exists locally (id=${existing}), skipping create`);
    return existing;
  }
  return createLocalHallFromViernulvierJson(hall, loginToken, authToken);
}

// fetch the amount of pages, then fetch each page and process the halls
export async function scrapeAllHalls(
  authToken: string
) {
  const loginToken = await login("admin", "password");

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

export async function scrapeHallById(
  id: number,
  authToken: string
) {
  const existing = await fetchLocalHallIdByOldId(id, authToken);
  if (existing !== null) return existing;

  const viernulvierUrl = `https://www.viernulvier.gent/api/v1/halls/${id}`;
  const viernulvierResponse = await fetch(viernulvierUrl, {
    headers: {
      accept: "application/ld+json",
      "X-AUTH-TOKEN": authToken,
    },
  });
  if (!viernulvierResponse.ok) {
    throw new Error(`Failed to fetch hall from Viernulvier API: ${viernulvierResponse.status} ${viernulvierResponse.statusText}`);
  }
  const hall = await viernulvierResponse.json() as HallJSON;
  const loginToken = await login("admin", "password");
  return createLocalHallFromViernulvierJson(hall, loginToken, authToken);
}