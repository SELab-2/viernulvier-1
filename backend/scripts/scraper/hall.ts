import type { Hall } from "@viernulvier/shared/index.js";

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
  space: string;
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

async function fetchSpaceLocation(spaceUrl: string, authToken: string): Promise<string> {
  // Check cache first
  if (spaceAddressCache.has(spaceUrl)) {
    return spaceAddressCache.get(spaceUrl) || "No address provided";
  }

  try {
    const url = `https://www.viernulvier.gent${spaceUrl}`;
    const response = await fetch(url, {
      headers: {
        accept: "application/ld+json",
        "X-AUTH-TOKEN": authToken,
      },
    });

    if (!response.ok) {
      spaceAddressCache.set(spaceUrl, "No address provided");
      return "No address provided";
    }

    const space = (await response.json()) as Space;
    const address = await fetchLocationAddress(space.location, authToken);
    
    // Cache the result
    spaceAddressCache.set(spaceUrl, address);
    return address;
  } catch {
    spaceAddressCache.set(spaceUrl, "No address provided");
    return "No address provided";
  }
}

async function fetchLocationAddress(locationUrl: string, authToken: string): Promise<string> {
  try {
    const url = `https://www.viernulvier.gent${locationUrl}`;
    const response = await fetch(url, {
      headers: {
        accept: "application/ld+json",
        "X-AUTH-TOKEN": authToken,
      },
    });

    if (!response.ok) {
      return "No address provided";
    }

    const location = (await response.json()) as Location;
    const address = `${location.street} ${location.number}, ${location.postal_code} ${location.city}, ${location.country}`;
    return address;
  } catch {
    return "No address provided";
  }
}

async function login(username: string, password: string): Promise<string> {
  const response = await fetch("http://localhost:3000/api/v1/auth/login", {
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


// Process a single hall: convert and create the hall in the current API
async function processHall(hall: HallJSON, loginToken: string, authToken: string): Promise<number> {
  const id = parseInt(hall["@id"].split("/").pop() as string, 10);

  // Fetch the space to get the location
  const address = await fetchSpaceLocation(hall.space, authToken);

  const body = {
    name: hall.name,
    address: address,
    old_id: id,
    vendor_id: 0,
  };

  const response = await fetch("http://localhost:3000/api/v1/hall", {
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

// fetch the amount of pages, then fetch each page and process the halls
export async function scrapeAllHalls(
  authToken: string
) {
  const loginToken = await login("admin", "password");

  const meta = await fetchHallsListMeta(authToken);
  const totalPages = meta.view.last.split("page=")[1] as unknown as number;
  
  for (let page = 1; page <= totalPages; page++) {
    const data = await fetchHallsPage(page, authToken);
    for (const hall of data.member) {
      console.log(`Processing hall ${hall["@id"]} (${page}/${totalPages})`);
      await processHall(hall, loginToken, authToken);
    }
  }
}

export async function scrapeHallById(
  id: number,
  authToken: string
) {
  const url = `http://localhost:3000/api/v1/hall?old_id=${id}`;
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
  if (hallList.length === 0) {
    const url = `https://www.viernulvier.gent/api/v1/halls/${id}`;
    const response = await fetch(url, {
      headers: {
        accept: "application/ld+json",
        "X-AUTH-TOKEN": authToken,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch hall: ${response.status} ${response.statusText}`);
    }
    const hall = await response.json() as HallJSON;
    const loginToken = await login("admin", "password");
    return await processHall(hall, loginToken, authToken);
  }
  if (hallList.length > 1) {
    throw new Error(`Multiple halls found with old_id ${id}`);
  }
  return hallList[0]!.id;
}