import type { Event } from "@viernulvier/shared/index.js";
import { EventSchemaWithoutPrice } from "@viernulvier/shared/index.js";

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

async function processEvent(event: EventJSON) {
  const eventParse = EventSchemaWithoutPrice.safeParse({
    id: parseInt(event["@id"].split("/").pop() as string, 10),
    starts_at: new Date(event.starts_at),
    ends_at: new Date(event.ends_at),
    doors_at: new Date(event.doors_at),
    vendor_id: event.vendor_id,
    info: event.info,
    production_id: parseInt(event.production["@id"].split("/").pop() as string, 10),
    hall_id: parseInt(event.hall.split("/").pop() as string, 10),
  });

  if (!eventParse.success) {
    console.error(`Failed to parse event ${event["@id"]}:`, eventParse.error);
    return;
  }

  const parsedEvent = eventParse.data as Event;
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
      await processEvent(event);
    }
  }
}