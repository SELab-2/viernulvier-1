

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
  vendor_id: number;
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

/**
 * Fetches events from the external viernulvier.gent API
 */
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

async function fetchEventRequest(id: number, authToken: string) {
  const url = `https://www.viernulvier.gent/api/v1/events/${id}`;

  const response = await fetch(url, {
    headers: {
      accept: "application/ld+json",
      "X-AUTH-TOKEN": authToken,
    },
  });

  if (!response.ok) {
    throw new Error(`API returned status ${response.status}`);
  }

  return await response;
}

async function fetchEventsPage(
  page: number = 1,
  beforeDate: Date = new Date(),
  authToken: string,
): Promise<ViernulvierApiResponse> {
  const response = await fetchPageRequest(page, beforeDate, authToken);

  const data = await response.json() as ViernulvierApiResponse;

  return data
}

async function fetchEventsListMeta(
  beforeDate: Date, 
  authToken: string
): Promise<EventListMeta> {
  const response = await fetchPageRequest(1, beforeDate, authToken);

  const data = await response.json() as EventListMeta;

  return data;
}

const hallMap: Record<number, number> = {};
async function getOldHall(id: number) {
  if (hallMap[id]) {
    return hallMap[id];
  }
  // To Implement: fetch the old hall ID based on the old API data
  return Number.MAX_SAFE_INTEGER; // return a dummy value for now, to avoid foreign key constraint errors
}

const productionMap: Record<number, number> = {};
async function getOldProduction(oldId: number) {
  if (productionMap[oldId]) {
    return productionMap[oldId];
  }
  // To Implement: fetch the old production ID based on the old API data
  else {
    const id = await voorbeeldFunctie(oldId)
    productionMap[oldId] = id;
    return id; // return a dummy value for now, to avoid foreign key constraint errors
  }
}

const eventPriceMap: Record<number, number> = {};
async function getOldEventPrice(oldId: number) {
  if (eventPriceMap[oldId]) {
    return eventPriceMap[oldId];
  }
  // To Implement: fetch the old event price ID based on the old API data
  return Number.MAX_SAFE_INTEGER; // return a dummy value for now, to avoid foreign key constraint errors
}

function processEvent(event: EventJSON) {
  const id = parseInt(event["@id"].split("/").pop() as string, 10);
  const hallId = parseInt(event.hall.split("/").pop() as string, 10);
  const productionId = parseInt(event.production["@id"].split("/").pop() as string, 10);
  const prices = event.prices.map((priceUrl) => {
    const priceId = parseInt(priceUrl.split("/").pop() as string, 10); 
    return getOldEventPrice(priceId); 
  });

  const body = {
    ...event,
    old_id: id,
    hall: getOldHall(hallId),
    production: getOldProduction(productionId),
  };
}


export async function scrapeAllEvents(
  beforeDate: Date,     
  authToken: string
) {
  const meta = await fetchEventsListMeta(beforeDate, authToken);
  const totalPages = meta.view.last.split("page=")[1] as unknown as number;
  for (let page = 1; page <= totalPages; page++) {
    const data = await fetchEventsPage(page, beforeDate, authToken);
    for (const event of data.member) {
      const id = event["@id"].split("/").pop() as unknown as number;
      console.log(`Processing event ${event["@id"]} (${page}/${totalPages})`);
      processEvent(event);
    }
  }
}

async function voorbeeldFunctie(oldId: number): Promise<number> {
  // To Implement: fetch the old production ID based on the old API data
  return Number.MAX_SAFE_INTEGER; // return a dummy value for now, to avoid foreign key constraint errors
}