import { scrapeHallById } from "./hall.js";

interface EventListMeta {
  totalItems: number;
  view: {
    "@id": string;
    "@type": string;
    first: string;
    last: string;
  };
}

interface EventJSON {
  "@id": string;
  starts_at: string;
  ends_at: string;
  doors_at: string;
  info: Record<string, string>;
  production: {
    "@id": string;
    "@type": string;
  };
  hall: string;
  prices: string[];
}

interface ViernulvierApiResponse {
  totalItems: number;
  member: EventJSON[];
}

// Fetch singular page and return raw response
async function fetchPageRequest(
  page: number = 1,
  beforeDate: Date = new Date(),
  authToken: string,
) {
  const formattedDate = beforeDate.toISOString();
  const url = new URL("https://www.viernulvier.gent/api/v1/events");
  url.searchParams.append("page", page.toString());
  url.searchParams.append("aanvang[before]", formattedDate);

  const response = await fetch(url.toString(), {
    headers: {
      accept: "application/ld+json",
      "X-AUTH-TOKEN": authToken,
    },
  });

  if (!response.ok) {
    throw new Error(`API returned status ${response.status}`);
  }

  return await response
}

// async function fetchEventRequest(id: number, authToken: string) {
//   const url = `https://www.viernulvier.gent/api/v1/events/${id}`;

//   const response = await fetch(url, {
//     headers: {
//       accept: "application/ld+json",
//       "X-AUTH-TOKEN": authToken,
//     },
//   });

//   if (!response.ok) {
//     throw new Error(`API returned status ${response.status}`);
//   }

//   return await response;
// }

// Fetch singular page of events, used for pagination, refine response to return parsed JSON
async function fetchEventsPage(
  page: number = 1,
  beforeDate: Date = new Date(),
  authToken: string,
): Promise<ViernulvierApiResponse> {
  const response = await fetchPageRequest(page, beforeDate, authToken);

  const data = await response.json() as ViernulvierApiResponse;

  return data
}

// Fetch first page to obtain the view and total items, view will contain the last page number, which we can use to fetch all pages
async function fetchEventsListMeta(
  beforeDate: Date, 
  authToken: string
): Promise<EventListMeta> {
  const response = await fetchPageRequest(1, beforeDate, authToken);

  const data = await response.json() as EventListMeta;

  return data;
}

// Login to the new API to obtain an auth token
async function login(username: string, password: string): Promise<string> {
  const response = await fetch("http://localhost:3000/api/v1/auth/login", {
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

// Cache for old hall IDs to avoid redundant fetches, if not cached, fetch the old ID.
// To Do: fetch function that maps old ID to current ID, if not present in db, fetch hall from old API and create it in current API, then return the new ID.
const hallMap: Record<number, number> = {};
async function getOldHall(oldId: number, authToken: string) {
  if (hallMap[oldId]) {
    return hallMap[oldId];
  }
  // To Implement: fetch the old hall ID based on the old API data
  const id = await scrapeHallById(oldId, authToken);
  hallMap[oldId] = id;
  return id; // return a dummy value for now, to avoid foreign key constraint errors
}

// Cache for old production IDs to avoid redundant fetches, if not cached, fetch the old ID.
// To Do: fetch function that maps old ID to current ID, if not present in db, fetch production from old API and create it in current API, then return the new ID.
const productionMap: Record<number, number> = {};
async function getOldProduction(oldId: number, authToken: string) {
  if (productionMap[oldId]) {
    return productionMap[oldId];
  }
  // To Implement: fetch the old production ID based on the old API data
  const id = await voorbeeldFunctie(oldId, authToken);
  productionMap[oldId] = id;
  return id; // return a dummy value for now, to avoid foreign key constraint errors
}

// Process a single event: convert old id references to current db ones, then create the event in the current API
async function processEvent(event: EventJSON, authToken: string, loginToken: string): Promise<void> {
  const id = parseInt(event["@id"].split("/").pop() as string, 10);
  const hallId = parseInt(event.hall.split("/").pop() as string, 10);
  const productionId = parseInt(event.production["@id"].split("/").pop() as string, 10);


  const body = {
    old_id: id,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    doors_at: event.doors_at,
    info: event.info,
    production: await getOldProduction(productionId, authToken),
    hall: await getOldHall(hallId, authToken),
  };

  const response = await fetch("http://localhost:3000/api/v1/event", {
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
  const prices = event.prices.map((priceUrl) => parseInt(priceUrl.split("/").pop() as string, 10));
  await dummyfunction(prices, eventId, authToken, loginToken);
}

// fetch the amount of pages, then fetch each page and process the events
export async function scrapeAllEvents(
  beforeDate: Date,     
  authToken: string
) {
  const loginToken = await login("admin", "password");
  const meta = await fetchEventsListMeta(beforeDate, authToken);
  const totalPages = meta.view.last.split("page=")[1] as unknown as number;
  const maxPages = 10; // Limit to 10 pages for testing
  const pagesToProcess = Math.min(totalPages, maxPages);
  
  console.log(`Processing ${pagesToProcess} pages (out of ${totalPages} total pages)`);
  
  for (let page = 1; page <= pagesToProcess; page++) {
    const data = await fetchEventsPage(page, beforeDate, authToken);
    for (const event of data.member) {
      // const id = event["@id"].split("/").pop() as unknown as number;
      console.log(`Processing event ${event["@id"]} (${page}/${pagesToProcess})`);
      await processEvent(event, authToken, loginToken);
    }
  }
}

async function voorbeeldFunctie(_oldId: number, _authToken: string): Promise<number> {
  // To Implement: fetch the old production ID based on the old API data
  return 1; // return a dummy value for now, to avoid foreign key constraint errors
}

async function dummyfunction(_prices: number[], _eventId: number, _authToken: string, _loginToken: string) {
  // To Implement: fetch the old production ID based on the old API data
  return; // return a dummy value for now, to avoid foreign key constraint errors
}