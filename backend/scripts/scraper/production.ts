import type { Production } from "@viernulvier/shared/index.js";

import { parseHydraLastPageIndex } from "./hydra-view.js";

interface ProductionListMeta {
  totalItems: number;
  view: {
    "@id": string;
    "@type": string;
    first: string;
    last: string;
  };
}

interface ProductionJSON {
  "@id": string;
  supertitle?: Record<string, string>;
  title: Record<string, string>;
  artist: Record<string, string>;
  tagline?: Record<string, string>;
  teaser?: Record<string, string>;
  description?: Record<string, string>;
  description_extra?: Record<string, string>;
  description_2?: Record<string, string>;
  video_1?: Record<string, string>;
  video_2?: Record<string, string>;
  quote?: Record<string, string>;
  quote_source?: Record<string, string>;
  programme?: Record<string, string>;
  info?: Record<string, string>;
  [key: string]: unknown;
}

interface ViernulvierProductionApiResponse {
  totalItems: number;
  member: ProductionJSON[];
}

// Fetch singular page and return raw response
async function fetchPageRequest(
  page: number = 1,
  authToken: string,
) {
  const url = new URL("https://www.viernulvier.gent/api/v1/productions");
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

// Fetch singular page of productions, used for pagination, refine response to return parsed JSON
async function fetchProductionsPage(
  page: number = 1,
  authToken: string,
): Promise<ViernulvierProductionApiResponse> {
  const response = await fetchPageRequest(page, authToken);

  const data = await response.json() as ViernulvierProductionApiResponse;

  return data;
}

// Fetch first page to obtain the view and total items, view will contain the last page number, which we can use to fetch all pages
async function fetchProductionsListMeta(
  authToken: string
): Promise<ProductionListMeta> {
  const response = await fetchPageRequest(1, authToken);

  const data = await response.json() as ProductionListMeta;

  return data;
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


// Process a single production: convert and create the production in the current API
async function processProduction(production: ProductionJSON, loginToken: string): Promise<number> {
  const id = parseInt(production["@id"].split("/").pop() as string, 10);

  const payload = {
    ...production,
    old_id: id,
    finalized: false,
  };

  const response = await fetch("http://localhost:3000/api/v1/production", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${loginToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to create production: ${response.status} ${response.statusText}`);
  }

  const productionId = (await response.json() as { id: number }).id;
  return productionId;
}

// fetch the amount of pages, then fetch each page and process the productions
export async function scrapeAllProductions(
  authToken: string
) {
  const loginToken = await login("admin", "password");

  const meta = await fetchProductionsListMeta(authToken);
  const totalPages = parseHydraLastPageIndex(meta.view.last);
  
  for (let page = 1; page <= totalPages; page++) {
    const data = await fetchProductionsPage(page, authToken);
    for (const production of data.member) {
      console.log(`Processing production ${production["@id"]} (${page}/${totalPages})`);
      await processProduction(production, loginToken);
    }
  }
}

export async function scrapeProductionById(
  id: number,
  authToken: string
) {
  const url = `http://localhost:3000/api/v1/production?old_id=${id}`;
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "X-AUTH-TOKEN": authToken,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch production from own api: ${response.status} ${response.statusText}`);
  }

  const productionList = await response.json() as { items: Production[], total: number };
  if (productionList.total === 0) {
    const url = `https://www.viernulvier.gent/api/v1/productions/${id}`;
    const response = await fetch(url, {
      headers: {
        accept: "application/ld+json",
        "X-AUTH-TOKEN": authToken,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch production: ${response.status} ${response.statusText}`);
    }
    const production = await response.json() as ProductionJSON;
    const loginToken = await login("admin", "password");
    return await processProduction(production, loginToken);
  }
  if (productionList.total > 1) {
    throw new Error(`Multiple productions found with old_id ${id}`);
  }

  return productionList.items[0]!.id;
}