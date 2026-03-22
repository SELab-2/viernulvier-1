import type { Event } from "@viernulvier/shared/index.js";

interface EventListMeta {
  totalItems: number;
  view: {
    "@id": string;
    "@type": string;
    first: string;
    last: string;
  };
}

interface ViernulvierApiResponse {
  totalItems: number;
  member: Event[];
}

/**
 * Fetches events from the external viernulvier.gent API
 */
async function fetchRequest(
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

async function fetchEventsPage(
  page: number = 1,
  beforeDate: Date = new Date(),
  authToken: string,
): Promise<ViernulvierApiResponse> {
  const response = await fetchRequest(page, beforeDate, authToken);

  const data = await response.json() as ViernulvierApiResponse;

  return data
}

async function fetchEventsListMeta(
  beforeDate: Date, 
  authToken: string
): Promise<EventListMeta> {
  const response = await fetchRequest(1, beforeDate, authToken);

  const data = await response.json() as EventListMeta;

  return data;
}

export async function scrapeAllEvents(
  beforeDate: Date, 
  authToken: string
) {
  const meta = await fetchEventsListMeta(beforeDate, authToken);
  const totalPages = meta.view.last.split("page=")[1] as unknown as number;

}